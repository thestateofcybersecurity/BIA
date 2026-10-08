import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed links that let a named process owner complete one impact assessment
 * without an account. The token is a bearer credential, so it carries only
 * the ids needed to find the record plus a hash of the address it was
 * issued to, is HMAC-signed against a server secret, expires, and is checked
 * against a request record in the workspace that the coordinator can revoke
 * at any time.
 */

const TTL_DAYS = 30;
export const CONTRIBUTION_TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

export interface ContributionClaims {
  /** Organization owning the workspace. */
  orgId: string;
  processId: string;
  /** Collection request id, so a revoked request invalidates the link. */
  requestId: string;
  issuedAt: number;
  /**
   * Hash of the recipient address the link was issued to. The request
   * record carries the address in clear; the link carries only this, so a
   * leaked token names nobody, yet a token minted for one recipient cannot
   * be redeemed against a request that was later issued to another.
   */
  recipientHash: string;
}

export function hashRecipient(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32);
}

let warnedFallback = false;

/**
 * The HMAC key. CONTRIBUTION_SECRET is the dedicated key; without it the
 * session cookie secret is used, which works but means one leaked key
 * compromises two surfaces. That fallback is logged once per process so it
 * shows up in the deployment logs rather than going unnoticed.
 */
function secret(): string | null {
  const dedicated = process.env.CONTRIBUTION_SECRET;
  if (dedicated) return dedicated;
  const fallback = process.env.NEON_AUTH_COOKIE_SECRET;
  if (fallback && !warnedFallback) {
    warnedFallback = true;
    console.warn(
      '[contribution] CONTRIBUTION_SECRET is not set; contribution links are being signed with NEON_AUTH_COOKIE_SECRET. Set a dedicated CONTRIBUTION_SECRET (openssl rand -base64 32) so the session cookie key is not reused for public bearer links. Changing the key invalidates outstanding links.'
    );
  }
  return fallback || null;
}

// Startup check: surface the fallback as soon as the module loads.
secret();

/** Contribution links are unavailable rather than insecure when unconfigured. */
export function contributionsEnabled(): boolean {
  return secret() != null;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

function sign(payload: string, key: string): string {
  return b64url(createHmac('sha256', key).update(payload).digest());
}

export function createContributionToken(
  claims: Omit<ContributionClaims, 'recipientHash'> & { email: string }
): string {
  const key = secret();
  if (!key) throw new Error('Contribution links require CONTRIBUTION_SECRET');
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        u: claims.orgId,
        p: claims.processId,
        r: claims.requestId,
        i: claims.issuedAt,
        e: hashRecipient(claims.email),
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

  let parsed: { u?: unknown; p?: unknown; r?: unknown; i?: unknown; e?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  const { u, p, r, i, e } = parsed;
  if (
    typeof u !== 'string' ||
    typeof p !== 'string' ||
    typeof r !== 'string' ||
    typeof i !== 'number' ||
    typeof e !== 'string'
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (now - i > CONTRIBUTION_TTL_MS) return { ok: false, reason: 'expired' };

  return {
    ok: true,
    claims: { orgId: u, processId: p, requestId: r, issuedAt: i, recipientHash: e },
  };
}

/** Whether the token was minted for the address the request record names. */
export function tokenIssuedTo(claims: ContributionClaims, email: string): boolean {
  const expected = Buffer.from(hashRecipient(email));
  const actual = Buffer.from(claims.recipientHash);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
