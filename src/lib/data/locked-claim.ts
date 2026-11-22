/**
 * Atomic check-and-claim for limits counted in a ledger table.
 *
 * "INSERT ... SELECT ... WHERE (SELECT count(*) ...) < limit" looks atomic
 * and is not. Under READ COMMITTED each statement takes its snapshot when it
 * starts, so two requests that arrive together both count the same rows,
 * both find room, and both insert. Measured against Postgres 16 with 24
 * connections, about one contended limit in twelve was overshot.
 *
 * The fix is to serialize claimers per key: take a transaction-scoped
 * advisory lock in one statement, then run the conditional insert as the
 * next statement of the same transaction. The insert takes its snapshot
 * only after it holds the lock, so it sees everything earlier holders
 * committed. The Neon HTTP driver has no interactive transactions, but its
 * batch form runs a fixed list of statements in one, which is all this
 * needs.
 */

type Sql = ReturnType<typeof import('@neondatabase/serverless').neon>;

/**
 * Run `claim` (a query built with the given tag, not yet awaited) while
 * holding the advisory lock for `key`. Returns the claim's rows.
 */
export async function lockedClaim<Row>(
  sql: Sql,
  key: string,
  claim: (sql: Sql) => unknown
): Promise<Row[]> {
  const results = (await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${key}))`,
    claim(sql) as never,
  ])) as unknown[];
  return results[1] as Row[];
}
