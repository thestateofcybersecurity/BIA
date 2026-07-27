import { promises as fs } from 'fs';
import path from 'path';
import type { Workspace } from '@/lib/domain/types';

/**
 * Workspace persistence. Each user/tenant owns one workspace document.
 * Backend is selected by environment:
 *  - DATABASE_URL set: Neon Postgres, table `workspaces`, one JSONB row per user
 *  - otherwise: local JSON files under ./data (dev and demo mode)
 */

export function emptyWorkspace(): Workspace {
  return {
    org: null,
    processes: [],
    assessments: [],
    objectives: [],
    remediations: [],
    workflows: [],
    maturity: null,
    exercises: [],
    resourceProfiles: [],
    plan: null,
    collectionRequests: [],
    risks: [],
  };
}

/** A workspace plus the version it was read at, for optimistic concurrency. */
export interface VersionedWorkspace {
  workspace: Workspace;
  version: number;
}

/** Raised when another member saved between our read and our write. */
export class ConcurrentEditError extends Error {
  constructor() {
    super('Another member changed this workspace while you were editing.');
    this.name = 'ConcurrentEditError';
  }
}

interface Store {
  load(orgId: string): Promise<Workspace>;
  /** Read with the version, so the write can detect a competing save. */
  loadForUpdate(orgId: string): Promise<VersionedWorkspace>;
  /**
   * Write only if the stored version still matches, so two people editing at
   * once cannot silently overwrite each other. Returns false on a conflict.
   */
  save(orgId: string, ws: Workspace, expectedVersion: number): Promise<boolean>;
  /** All organization ids with a stored workspace (scheduled notifications). */
  listOrgIds(): Promise<string[]>;
}

const DATA_DIR = path.join(process.cwd(), 'data');

const fileStore: Store = {
  async load(orgId) {
    return (await fileStore.loadForUpdate(orgId)).workspace;
  },
  async loadForUpdate(orgId) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${orgId}.json`), 'utf8');
      const parsed = JSON.parse(raw) as Workspace & { __version?: number };
      const version = parsed.__version ?? 1;
      delete parsed.__version;
      return { workspace: { ...emptyWorkspace(), ...parsed }, version };
    } catch {
      return { workspace: emptyWorkspace(), version: 0 };
    }
  },
  async save(orgId, ws, expectedVersion) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const current = await fileStore.loadForUpdate(orgId);
    if (current.version !== expectedVersion) return false;
    const file = path.join(DATA_DIR, `${orgId}.json`);
    const tmp = `${file}.tmp`;
    await fs.writeFile(
      tmp,
      JSON.stringify({ ...ws, __version: expectedVersion + 1 }, null, 2),
      'utf8'
    );
    await fs.rename(tmp, file);
    return true;
  },
  async listOrgIds() {
    try {
      const files = await fs.readdir(DATA_DIR);
      return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
    } catch {
      return [];
    }
  },
};

function neonStore(url: string): Store {
  // Shared across invocations and hot reloads; the table is ensured once
  // per process before first use.
  const g = globalThis as {
    _biaSql?: ReturnType<typeof import('@neondatabase/serverless').neon>;
    _biaTableReady?: Promise<unknown>;
  };
  const getSql = async () => {
    if (!g._biaSql) {
      const { neon } = await import('@neondatabase/serverless');
      g._biaSql = neon(url);
    }
    if (!g._biaTableReady) {
      // Tenancy owns org_workspaces; ensuring it here too keeps the store
      // usable on its own (scripts, the cron job) without ordering games.
      g._biaTableReady = g._biaSql`
        CREATE TABLE IF NOT EXISTS org_workspaces (
          org_id text PRIMARY KEY,
          data jsonb NOT NULL,
          version integer NOT NULL DEFAULT 1,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`;
    }
    await g._biaTableReady;
    return g._biaSql;
  };
  return {
    async load(orgId) {
      const sql = await getSql();
      const rows = (await sql`
        SELECT data FROM org_workspaces WHERE org_id = ${orgId}
      `) as { data: Workspace }[];
      if (rows.length === 0) return emptyWorkspace();
      return { ...emptyWorkspace(), ...rows[0].data };
    },
    async loadForUpdate(orgId) {
      const sql = await getSql();
      const rows = (await sql`
        SELECT data, version FROM org_workspaces WHERE org_id = ${orgId}
      `) as { data: Workspace; version: number }[];
      if (rows.length === 0) return { workspace: emptyWorkspace(), version: 0 };
      return {
        workspace: { ...emptyWorkspace(), ...rows[0].data },
        version: rows[0].version,
      };
    },
    async save(orgId, ws, expectedVersion) {
      const sql = await getSql();
      if (expectedVersion === 0) {
        // First write for this organization; a competing insert loses here
        // rather than overwriting.
        const inserted = (await sql`
          INSERT INTO org_workspaces (org_id, data, version)
          VALUES (${orgId}, ${JSON.stringify(ws)}::jsonb, 1)
          ON CONFLICT (org_id) DO NOTHING
          RETURNING org_id
        `) as { org_id: string }[];
        return inserted.length > 0;
      }
      const updated = (await sql`
        UPDATE org_workspaces
        SET data = ${JSON.stringify(ws)}::jsonb,
            version = version + 1,
            updated_at = now()
        WHERE org_id = ${orgId} AND version = ${expectedVersion}
        RETURNING org_id
      `) as { org_id: string }[];
      return updated.length > 0;
    },
    async listOrgIds() {
      const sql = await getSql();
      const rows = (await sql`SELECT org_id FROM org_workspaces`) as { org_id: string }[];
      return rows.map((r) => r.org_id);
    },
  };
}

export function getStore(): Store {
  const url = process.env.DATABASE_URL;
  return url ? neonStore(url) : fileStore;
}
