/**
 * Fixed-window counters for things that must not run unbounded: outbound
 * email per organization, PDF renders and imports per user.
 *
 * With DATABASE_URL the counter is a ledger table and the check-and-claim is
 * one INSERT ... SELECT ... WHERE count < limit, so concurrent callers on
 * different serverless instances cannot all pass against the same remaining
 * count (the same construction as the AI exercise slot). Without a database
 * (demo mode, local dev) a per-process memory window stands in.
 */

type Sql = ReturnType<typeof import('@neondatabase/serverless').neon>;

const g = globalThis as {
  _biaRateSql?: Sql;
  _biaRateReady?: Promise<unknown>;
};

async function getSql(url: string): Promise<Sql> {
  if (!g._biaRateSql) {
    const { neon } = await import('@neondatabase/serverless');
    g._biaRateSql = neon(url);
  }
  const sql = g._biaRateSql;
  if (!g._biaRateReady) {
    g._biaRateReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS usage_events (
          id bigserial PRIMARY KEY,
          scope text NOT NULL,
          at timestamptz NOT NULL DEFAULT now()
        )`;
      await sql`CREATE INDEX IF NOT EXISTS usage_events_scope_idx ON usage_events (scope, at DESC)`;
    })().catch((e: unknown) => {
      // A failed bootstrap must not poison the process; retry next call.
      g._biaRateReady = undefined;
      throw e;
    });
  }
  await g._biaRateReady;
  return sql;
}

const memory = new Map<string, number[]>();

/**
 * In-memory window: true when a slot was claimed, false when the scope
 * already has `limit` claims inside the last `windowMs`. Exported for the
 * no-database path and for tests.
 */
export function claimMemorySlot(
  scope: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): boolean {
  if (limit <= 0) return false;
  const cutoff = now - windowMs;
  const stamps = (memory.get(scope) ?? []).filter((t) => t > cutoff);
  if (stamps.length >= limit) {
    memory.set(scope, stamps);
    return false;
  }
  stamps.push(now);
  memory.set(scope, stamps);
  return true;
}

/** Test hook. */
export function resetMemorySlots(): void {
  memory.clear();
}

/**
 * Claim one slot for `scope`, allowing at most `limit` claims per
 * `windowMs`. Returns false when the window is full; the caller decides how
 * to refuse. Nothing is ever refunded: a failed send or render still spent
 * the attempt, and counting attempts is what keeps a retry loop bounded.
 */
export async function claimSlot(scope: string, limit: number, windowMs: number): Promise<boolean> {
  if (limit <= 0) return false;
  const url = process.env.DATABASE_URL;
  if (!url) return claimMemorySlot(scope, limit, windowMs);

  const sql = await getSql(url);
  const since = new Date(Date.now() - windowMs).toISOString();
  const rows = (await sql`
    INSERT INTO usage_events (scope)
    SELECT ${scope}
    WHERE (
      SELECT count(*) FROM usage_events
      WHERE scope = ${scope} AND at >= ${since}
    ) < ${limit}
    RETURNING id
  `) as { id: number }[];

  // Opportunistic housekeeping: nothing reads events older than the longest
  // window (one day), so a small fraction of calls sweeps the stale rows.
  if (Math.random() < 0.02) {
    void sql`DELETE FROM usage_events WHERE at < now() - interval '2 days'`.catch(() => {});
  }
  return rows.length > 0;
}
