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
  };
}

interface Store {
  load(userId: string): Promise<Workspace>;
  save(userId: string, ws: Workspace): Promise<void>;
}

const DATA_DIR = path.join(process.cwd(), 'data');

const fileStore: Store = {
  async load(userId) {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${userId}.json`), 'utf8');
      return { ...emptyWorkspace(), ...JSON.parse(raw) };
    } catch {
      return emptyWorkspace();
    }
  },
  async save(userId, ws) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, `${userId}.json`);
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(ws, null, 2), 'utf8');
    await fs.rename(tmp, file);
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
      g._biaTableReady = g._biaSql`
        CREATE TABLE IF NOT EXISTS workspaces (
          user_id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`;
    }
    await g._biaTableReady;
    return g._biaSql;
  };
  return {
    async load(userId) {
      const sql = await getSql();
      const rows = (await sql`
        SELECT data FROM workspaces WHERE user_id = ${userId}
      `) as { data: Workspace }[];
      if (rows.length === 0) return emptyWorkspace();
      return { ...emptyWorkspace(), ...rows[0].data };
    },
    async save(userId, ws) {
      const sql = await getSql();
      await sql`
        INSERT INTO workspaces (user_id, data, updated_at)
        VALUES (${userId}, ${JSON.stringify(ws)}::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `;
    },
  };
}

export function getStore(): Store {
  const url = process.env.DATABASE_URL;
  return url ? neonStore(url) : fileStore;
}
