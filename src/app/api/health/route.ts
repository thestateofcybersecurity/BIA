import { aiEnabled } from '@/lib/ai/client';
import { authEnabled } from '@/lib/neon-auth';
import { bearerMatches } from '@/lib/bearer';

export const dynamic = 'force-dynamic';

/**
 * Liveness for uptime checks. The configuration presence flags (which
 * integrations are wired up) are only returned to a caller presenting the
 * HEALTH_DETAIL_TOKEN bearer; anonymous callers learn only that the app is
 * up. Values are never returned.
 */
export async function GET(req: Request) {
  const token = process.env.HEALTH_DETAIL_TOKEN;
  if (token && bearerMatches(req, token)) {
    return Response.json({
      ok: true,
      db: Boolean(process.env.DATABASE_URL),
      auth: authEnabled(),
      ai: aiEnabled(),
    });
  }
  return Response.json({ ok: true });
}
