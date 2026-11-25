import type { DependencyMap } from '@/lib/domain/types';

/**
 * Size ceiling for the PDF export.
 *
 * Laying the document out is synchronous CPU, and it holds the event loop:
 * while one export renders, the instance answers nothing else. The cost
 * follows the number of table rows the document carries, roughly 15 ms per
 * row at small sizes and worse beyond: 100 processes take about 5 seconds,
 * 200 about 16, and 600 several minutes. A workspace can legitimately hold
 * thousands of processes (one spreadsheet import), so the export refuses
 * anything past a row budget that renders in roughly 15 seconds and points
 * to the on-screen report, which prints from the browser at no server cost.
 */
export const PDF_MAX_WEIGHT = 1000;

interface Sized {
  processes: { dependencies: DependencyMap }[];
  risks: unknown[];
  workflows: { steps: unknown[] }[];
}

/**
 * Approximate table rows in the rendered document. A process appears in
 * about five tables; each distinct dependency gets a row in the inherited
 * requirements section; each dependency entry adds a little to its
 * process's own listing; risks and recovery steps are a row each.
 */
export function pdfRenderWeight(ws: Sized): number {
  const distinct = new Set<string>();
  let entries = 0;
  for (const p of ws.processes) {
    for (const [cls, list] of Object.entries(p.dependencies ?? {}) as [string, string[]][]) {
      entries += list.length;
      for (const name of list) distinct.add(`${cls}:${name.trim().toLowerCase()}`);
    }
  }
  const steps = ws.workflows.reduce((sum, w) => sum + w.steps.length, 0);
  return Math.round(
    ws.processes.length * 5 + distinct.size + entries * 0.2 + ws.risks.length + steps
  );
}

/** Why this workspace is too large to export as a PDF, or null when it is not. */
export function pdfExportBlocker(ws: Sized): string | null {
  const weight = pdfRenderWeight(ws);
  if (weight <= PDF_MAX_WEIGHT) return null;
  return `This workspace is too large for the PDF export (about ${weight} table rows across processes, dependencies, risks, and recovery steps; the limit is ${PDF_MAX_WEIGHT}). Use "Browser print" on the report page instead.`;
}
