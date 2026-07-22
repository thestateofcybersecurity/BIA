import { aiEnabled } from '@/lib/ai/client';
import { authEnabled } from '@/lib/neon-auth';

export const dynamic = 'force-dynamic';

/** Configuration presence flags only; never values. */
export async function GET() {
  return Response.json({
    ok: true,
    db: Boolean(process.env.DATABASE_URL),
    auth: authEnabled(),
    ai: aiEnabled(),
  });
}
