import { renderToBuffer } from '@react-pdf/renderer';
import { loadWorkspace } from '@/lib/actions';
import { ReportDocument } from '@/lib/pdf/report';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
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
