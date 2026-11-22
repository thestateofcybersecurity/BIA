import { authEnabled, getAuth } from '@/lib/neon-auth';
import { isSafeAuthProxyPath } from '@/lib/request-policy';

type Ctx = { params: Promise<{ path: string[] }> };

const handlers = authEnabled() ? getAuth().handler() : null;

/**
 * The Neon Auth proxy. The handler forwards whatever path it is given, so
 * the segments are checked here first: only plain labels reach the
 * upstream, which keeps every forwarded request inside the auth base path.
 */
async function forward(method: 'GET' | 'POST', req: Request, ctx: Ctx) {
  if (!handlers) return new Response('Not found', { status: 404 });
  const { path } = await ctx.params;
  if (!isSafeAuthProxyPath(path)) return new Response('Not found', { status: 404 });
  return handlers[method](req, ctx as never);
}

export async function GET(req: Request, ctx: Ctx) {
  return forward('GET', req, ctx);
}

export async function POST(req: Request, ctx: Ctx) {
  return forward('POST', req, ctx);
}
