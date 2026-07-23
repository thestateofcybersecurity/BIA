import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Resolves a workspace user id to the account's email via the Neon Auth
 * tables that live in our own database. Table naming has shifted across
 * Neon Auth generations, so we probe known layouts and remember the one
 * that works for the life of the process. Returns null in demo mode.
 */

export interface UserContact {
  email: string;
  name: string | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _biaContactQuery: number | undefined;
}

type Sql = NeonQueryFunction<false, false>;

const QUERIES = [
  (sql: Sql, id: string) => sql`SELECT email, name FROM neon_auth."user" WHERE id = ${id}`,
  (sql: Sql, id: string) => sql`SELECT email, name FROM neon_auth.users_sync WHERE id = ${id}`,
];

export async function getUserContact(userId: string): Promise<UserContact | null> {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const sql = neon(url);

  const order =
    globalThis._biaContactQuery != null
      ? [globalThis._biaContactQuery, ...QUERIES.keys()].filter((v, i, a) => a.indexOf(v) === i)
      : [...QUERIES.keys()];

  for (const i of order) {
    try {
      const rows = (await QUERIES[i](sql, userId)) as { email?: string; name?: string }[];
      if (rows[0]?.email) {
        globalThis._biaContactQuery = i;
        return { email: rows[0].email, name: rows[0].name ?? null };
      }
      // Table exists but no row for this user; remember the working table.
      globalThis._biaContactQuery = i;
      return null;
    } catch {
      // Table missing in this layout; try the next.
    }
  }
  return null;
}
