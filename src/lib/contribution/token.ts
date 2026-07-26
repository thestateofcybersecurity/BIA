import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed links that let a named process owner complete one impact assessment
 * without an account. The token is a bearer credential, so it carries only
 * the ids needed to find the record, is HMAC-signed against a server secret,
 * expires, and is checked against a request record in the workspace that the
 * coordinator can revoke at any time.
 */

const TTL_DAYS = 30;
export const CONTRIBUTION_TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export interface ContributionClaims {
  /** Workspace owner (the BIA coordinator). */
  userId: string;
  processId: string;
  /** Collection request id, so a revoked request invalidates the link. */
  requestId: string;
  issuedAt: number;
}

function secret(): string | null {
  return (
    process.env.CONTRIBUTION_SECRET ||
    process.env.NEON_AUTH_COOKIE_SECRET ||
    null
  );
}

/** Contribution links are unavailable rather than insecure when unconfigured. */
export function contributionsEnabled(): boolean {
  return secret() != null;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(payload: string, key: string): string {
  return b64url(createHmac('sha256', key).update(payload).digest());
}

export function createContributionToken(claims: ContributionClaims): string {
  const key = secret();
  if (!key) throw new Error('Contribution links require CONTRIBUTION_SECRET');
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        u: claims.userId,
        p: claims.processId,
        r: claims.requestId,
        i: claims.issuedAt,
      })
    )
  );
  return `${payload}.${sign(payload, key)}`;
}

export type TokenFailure = 'unconfigured' | 'malformed' | 'bad_signature' | 'expired';

export function verifyContributionToken(
  token: string,
  now = Date.now()
): { ok: true; claims: ContributionClaims } | { ok: false; reason: TokenFailure } {
  const key = secret();
  if (!key) return { ok: false, reason: 'unconfigured' };

  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'malformed' };
  const [payload, signature] = parts;

  const expected = Buffer.from(sign(payload, key));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { ok: false, reason: 'bad_signature' };
  }

  let parsed: { u?: unknown; p?: unknown; r?: unknown; i?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const { u, p, r, i } = parsed;
  if (
    typeof u !== 'string' ||
    typeof p !== 'string' ||
    typeof r !== 'string' ||
    typeof i !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (now - i > CONTRIBUTION_TTL_MS) return { ok: false, reason: 'expired' };

  return { ok: true, claims: { userId: u, processId: p, requestId: r, issuedAt: i } };
}
