import { promises as fs } from 'fs';
import path from 'path';
import type { Workspace } from '@/lib/domain/types';

/**
 * Workspace persistence. Each user/tenant owns one workspace document.
 * Backend is selected by environment:
 *  - MONGODB_URI set: MongoDB, collection `workspaces`, _id = userId
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

function mongoStore(uri: string): Store {
  // Lazy client shared across invocations (survives hot reload via globalThis).
  const getCollection = async () => {
    const g = globalThis as { _biaMongo?: Promise<import('mongodb').MongoClient> };
    if (!g._biaMongo) {
      const { MongoClient } = await import('mongodb');
      g._biaMongo = new MongoClient(uri).connect();
    }
    const client = await g._biaMongo;
    return client.db(process.env.MONGODB_DB || 'bia').collection('workspaces');
  };
  return {
    async load(userId) {
      const col = await getCollection();
      const doc = await col.findOne({ _id: userId as never });
      if (!doc) return emptyWorkspace();
      const { _id, ...ws } = doc;
      return { ...emptyWorkspace(), ...(ws as unknown as Workspace) };
    },
    async save(userId, ws) {
      const col = await getCollection();
      await col.replaceOne({ _id: userId as never }, ws as never, { upsert: true });
    },
  };
}

export function getStore(): Store {
  const uri = process.env.MONGODB_URI;
  return uri ? mongoStore(uri) : fileStore;
}
