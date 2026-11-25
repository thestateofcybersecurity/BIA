/**
 * Test harness for exercising server actions and route handlers end to end
 * without Neon or Neon Auth: a PGlite (in-process Postgres) database stands
 * in for the Neon HTTP driver, and the session, cookie jar, cache, and
 * navigation seams of Next.js are replaced with in-memory fakes.
 *
 * Usage, at the top of a test file (vi.mock calls are hoisted):
 *
 *   import { vi } from 'vitest';
 *   import { harness } from './helpers/harness';
 *   vi.mock('@neondatabase/serverless', () => harness.neonModule());
 *   vi.mock('next/headers', () => harness.headersModule());
 *   vi.mock('next/cache', () => harness.cacheModule());
 *   vi.mock('next/navigation', () => harness.navigationModule());
 *   vi.mock('@/lib/neon-auth', () => harness.authModule());
 */
import { PGlite } from '@electric-sql/pglite';

export interface TestUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

class CookieJar {
  private values = new Map<string, string>();
  get(name: string) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { name, value };
  }
  set(name: string, value: string) {
    this.values.set(name, value);
  }
  delete(name: string) {
    this.values.delete(name);
  }
  has(name: string) {
    return this.values.has(name);
  }
  clear() {
    this.values.clear();
  }
}

/**
 * Nothing in a test may reach a real service. The database, identity
 * provider, email provider, and model are all faked; any stray outbound
 * request fails loudly here instead of leaving the machine.
 */
globalThis.fetch = (async (input: unknown) => {
  throw new Error(`network is disabled in tests (attempted: ${String(input).slice(0, 80)})`);
}) as typeof fetch;

/** Connection and bootstrap caches the data modules keep on globalThis. */
const GLOBAL_CACHES = [
  '_biaTenancySql',
  '_biaTenancyReady',
  '_biaSql',
  '_biaTableReady',
  '_biaRateSql',
  '_biaRateReady',
  '_biaContactQuery',
];

class Harness {
  private db: PGlite | null = null;
  private user: TestUser | null = null;
  /** One cookie jar per signed-in user, like one browser each. */
  private jars = new Map<string, CookieJar>();
  private anonymousJar = new CookieJar();
  /** Every statement sent to the database, for assertions on query shape. */
  readonly statements: string[] = [];
  /** Every message handed to the fake email provider. */
  readonly outbox: { to: string; subject: string; html: string; text: string }[] = [];

  /** A fresh database and no session. Call from beforeEach. */
  async reset(): Promise<void> {
    if (this.db) await this.db.close();
    this.db = new PGlite();
    await this.db.exec(`
      CREATE SCHEMA IF NOT EXISTS neon_auth;
      CREATE TABLE IF NOT EXISTS neon_auth."user" (
        id text PRIMARY KEY, email text, name text, "emailVerified" boolean
      );
    `);
    this.user = null;
    this.jars.clear();
    this.anonymousJar.clear();
    this.statements.length = 0;
    this.outbox.length = 0;
    // A new database needs the cached connections and bootstraps rebuilt.
    const g = globalThis as Record<string, unknown>;
    for (const key of GLOBAL_CACHES) g[key] = undefined;
    process.env.DATABASE_URL = 'postgres://local:local@pglite.invalid/bia';
  }

  async close(): Promise<void> {
    if (this.db) await this.db.close();
    this.db = null;
  }

  /** Sign in as this user (or out, with null) for the calls that follow. */
  async actAs(user: TestUser | null): Promise<void> {
    this.user = user;
    if (user) {
      await this.query(
        `INSERT INTO neon_auth."user" (id, email, name, "emailVerified") VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name,
           "emailVerified" = EXCLUDED."emailVerified"`,
        [user.id, user.email, user.name ?? null, user.emailVerified]
      );
    }
  }

  currentUser(): TestUser | null {
    return this.user;
  }

  jar(): CookieJar {
    if (!this.user) return this.anonymousJar;
    let jar = this.jars.get(this.user.id);
    if (!jar) {
      jar = new CookieJar();
      this.jars.set(this.user.id, jar);
    }
    return jar;
  }

  /** Direct SQL for arranging and asserting state. */
  async query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
    if (!this.db) throw new Error('harness.reset() has not run');
    const result = await this.db.query(text, params);
    return result.rows as T[];
  }

  // ---- module fakes ----

  neonModule() {
    // Like the real driver, a tagged-template call builds a query that runs
    // only when it is awaited (or handed to transaction()), and runs once.
    const run = (strings: TemplateStringsArray, ...values: unknown[]) => {
      let text = strings[0];
      for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
      let started: Promise<unknown[]> | null = null;
      const execute = () => {
        if (!started) {
          this.statements.push(text);
          started = this.query(text, values);
        }
        return started;
      };
      return {
        then: (resolve?: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
          execute().then(resolve, reject),
        catch: (reject?: (e: unknown) => unknown) => execute().catch(reject),
        finally: (fn?: () => void) => execute().finally(fn),
      };
    };
    // The driver's batch transaction. Statements run in order on the one
    // connection, which is the serial execution the real transaction gives.
    const transaction = async (queries: PromiseLike<unknown>[]) => {
      const results: unknown[] = [];
      for (const query of queries) results.push(await query);
      return results;
    };
    return { neon: () => Object.assign(run, { transaction }), neonConfig: {} };
  }

  headersModule() {
    return {
      cookies: async () => this.jar(),
      headers: async () => new Headers(),
    };
  }

  cacheModule() {
    return { revalidatePath: () => {}, revalidateTag: () => {} };
  }

  navigationModule() {
    return {
      redirect: (url: string) => {
        throw new Error(`NEXT_REDIRECT:${url}`);
      },
      notFound: () => {
        throw new Error('NEXT_NOT_FOUND');
      },
    };
  }

  /** Stand-in for the Resend SDK: records instead of sending. */
  resendModule() {
    const outbox = this.outbox;
    class Resend {
      emails = {
        send: async (message: { to: string; subject: string; html: string; text: string }) => {
          outbox.push(message);
          return { data: { id: `local-${outbox.length}` }, error: null };
        },
      };
    }
    return { Resend };
  }

  authModule() {
    return {
      authEnabled: () => true,
      demoModeAllowed: () => false,
      getAuth: () => ({
        getSession: async () => ({
          data: this.user
            ? {
                session: { id: `s_${this.user.id}`, userId: this.user.id },
                user: { ...this.user },
              }
            : null,
        }),
      }),
    };
  }
}

export const harness = new Harness();

/** Convenience identities: organization A's people, B's owner, an outsider. */
export const users = {
  aliceOwnerA: { id: 'u_alice', email: 'alice@orga-corp.com', emailVerified: true, name: 'Alice' },
  adminA: { id: 'u_adam', email: 'adam@orga-corp.com', emailVerified: true, name: 'Adam' },
  coordA: { id: 'u_cora', email: 'cora@orga-corp.com', emailVerified: true, name: 'Cora' },
  contribA: { id: 'u_carl', email: 'carl@orga-corp.com', emailVerified: true, name: 'Carl' },
  viewerA: { id: 'u_vera', email: 'vera@orga-corp.com', emailVerified: true, name: 'Vera' },
  bobOwnerB: { id: 'u_bob', email: 'bob@orgb-corp.com', emailVerified: true, name: 'Bob' },
  malloryGmail: { id: 'u_mallory', email: 'mallory@gmail.com', emailVerified: true, name: 'Mallory' },
} satisfies Record<string, TestUser>;
