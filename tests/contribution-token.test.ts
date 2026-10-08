import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('contribution tokens', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.CONTRIBUTION_SECRET = 'test-secret-for-contribution-links';
  });
  afterEach(() => {
    delete process.env.CONTRIBUTION_SECRET;
    delete process.env.NEON_AUTH_COOKIE_SECRET;
  });

  it('round-trips the claims and binds the token to the recipient', async () => {
    const { createContributionToken, verifyContributionToken, tokenIssuedTo } = await import(
      '@/lib/contribution/token'
    );
    const token = createContributionToken({
      orgId: 'org_1',
      processId: 'p1',
      requestId: 'req1',
      issuedAt: 1_700_000_000_000,
      email: 'Owner@Example.com',
    });
    const verified = verifyContributionToken(token, 1_700_000_000_000 + 1000);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.claims).toMatchObject({ orgId: 'org_1', processId: 'p1', requestId: 'req1' });
    expect(tokenIssuedTo(verified.claims, 'owner@example.com')).toBe(true);
    expect(tokenIssuedTo(verified.claims, 'someone-else@example.com')).toBe(false);
    // The link carries a hash, never the address.
    expect(Buffer.from(token.split('.')[0], 'base64url').toString('utf8')).not.toContain('example.com');
  });

  it('rejects tampering, legacy tokens without a recipient, and expiry', async () => {
    const { createContributionToken, verifyContributionToken, CONTRIBUTION_TTL_MS } = await import(
      '@/lib/contribution/token'
    );
    const issuedAt = 1_700_000_000_000;
    const token = createContributionToken({
      orgId: 'org_1',
      processId: 'p1',
      requestId: 'req1',
      issuedAt,
      email: 'owner@example.com',
    });
    const [payload, signature] = token.split('.');

    const forged = Buffer.from(
      JSON.stringify({ u: 'org_2', p: 'p1', r: 'req1', i: issuedAt, e: 'x' })
    ).toString('base64url');
    expect(verifyContributionToken(`${forged}.${signature}`, issuedAt)).toEqual({
      ok: false,
      reason: 'bad_signature',
    });
    expect(verifyContributionToken(`${payload}`, issuedAt)).toEqual({ ok: false, reason: 'malformed' });
    expect(verifyContributionToken(token, issuedAt + CONTRIBUTION_TTL_MS + 1)).toEqual({
      ok: false,
      reason: 'expired',
    });

    // A token signed before recipient binding existed carries no `e` claim.
    const { createHmac } = await import('node:crypto');
    const legacyPayload = Buffer.from(
      JSON.stringify({ u: 'org_1', p: 'p1', r: 'req1', i: issuedAt })
    ).toString('base64url');
    const legacySig = createHmac('sha256', process.env.CONTRIBUTION_SECRET!)
      .update(legacyPayload)
      .digest('base64url');
    expect(verifyContributionToken(`${legacyPayload}.${legacySig}`, issuedAt)).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('warns once when falling back to the cookie secret, and is disabled with neither', async () => {
    delete process.env.CONTRIBUTION_SECRET;
    process.env.NEON_AUTH_COOKIE_SECRET = 'cookie-secret';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mod = await import('@/lib/contribution/token');
    expect(mod.contributionsEnabled()).toBe(true);
    mod.contributionsEnabled();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('CONTRIBUTION_SECRET is not set');
    warn.mockRestore();

    vi.resetModules();
    delete process.env.NEON_AUTH_COOKIE_SECRET;
    const bare = await import('@/lib/contribution/token');
    expect(bare.contributionsEnabled()).toBe(false);
  });
});
