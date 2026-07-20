import { authEnabled, getAuth } from '@/lib/neon-auth';

type Ctx = { params: Promise<{ path: string[] }> };

const handlers = authEnabled() ? getAuth().handler() : null;

export async function GET(req: Request, ctx: Ctx) {
  if (!handlers) return new Response('Not found', { status: 404 });
  return handlers.GET(req, ctx as never);
}

export async function POST(req: Request, ctx: Ctx) {
  if (!handlers) return new Response('Not found', { status: 404 });
  return handlers.POST(req, ctx as never);
}
