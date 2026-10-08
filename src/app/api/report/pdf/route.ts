import { renderToBuffer } from '@react-pdf/renderer';
import { loadWorkspace } from '@/lib/actions';
import { ReportDocument } from '@/lib/pdf/report';
import { getAuthContext } from '@/lib/auth';
import { can } from '@/lib/domain/authz';
import { claimSlot } from '@/lib/data/rate-limit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const ctx = await getAuthContext();
  if (!can(ctx.role, 'report:export')) {
    return new Response('Your role does not include report export.', { status: 403 });
  }
  // Rendering is the most CPU-heavy thing a member can ask for, and a
  // workspace can be large; three renders a minute per person is plenty.
  if (!(await claimSlot(`pdf:${ctx.userId}`, 3, 60_000))) {
    return new Response('Too many report exports in the last minute. Wait a moment and try again.', {
      status: 429,
      headers: { 'Retry-After': '60' },
    });
  }
  const ws = await loadWorkspace();
  if (!ws.org || ws.processes.length === 0) {
    return new Response(
      'Not enough data for a report. Set up the organization profile and add processes first.',
      { status: 400 }
    );
  }

  const generatedAt = new Date().toISOString();
  const buffer = await renderToBuffer(
    ReportDocument({ ws, generatedAt }) as never
  );

  const safeName = ws.org.name.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  const date = generatedAt.slice(0, 10);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="BC-Plan-${safeName}-${date}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
