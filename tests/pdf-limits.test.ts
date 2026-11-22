/**
 * N10 (pentest 2026-11-22): the PDF export refuses a workspace whose render
 * would hold the server for minutes, before any layout work starts.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { harness, users } from './helpers/harness';
import { bootstrapOrg } from './helpers/scenario';
import { PDF_MAX_WEIGHT, pdfExportBlocker, pdfRenderWeight } from '@/lib/pdf/limits';

vi.mock('@neondatabase/serverless', () => harness.neonModule());
vi.mock('next/headers', () => harness.headersModule());
vi.mock('next/cache', () => harness.cacheModule());
vi.mock('next/navigation', () => harness.navigationModule());
vi.mock('@/lib/neon-auth', () => harness.authModule());

const deps = (applications: string[] = []) => ({
  people: [],
  applications,
  equipment: [],
  facilities: [],
  suppliers: [],
  data: [],
});

const sized = (processes: number, depsEach = 0, risks = 0, stepsEach = 0) => ({
  processes: Array.from({ length: processes }, (_, i) => ({
    dependencies: deps(Array.from({ length: depsEach }, (_, k) => `App ${i}-${k}`)),
  })),
  risks: Array.from({ length: risks }, () => ({})),
  workflows: Array.from({ length: stepsEach > 0 ? processes : 0 }, () => ({
    steps: Array.from({ length: stepsEach }, () => ({})),
  })),
});

beforeEach(async () => {
  await harness.reset();
});

afterAll(async () => {
  await harness.close();
});

describe('pdfRenderWeight and pdfExportBlocker', () => {
  it('lets an ordinary program through', () => {
    // 60 processes, 3 dependencies each, 40 risks, 4 recovery steps each.
    const ws = sized(60, 3, 40, 4);
    expect(pdfRenderWeight(ws)).toBeLessThanOrEqual(PDF_MAX_WEIGHT);
    expect(pdfExportBlocker(ws)).toBeNull();
  });

  it('counts a dependency shared by many processes once', () => {
    const shared = {
      processes: Array.from({ length: 100 }, () => ({ dependencies: deps(['ERP', 'Email']) })),
      risks: [],
      workflows: [],
    };
    expect(pdfRenderWeight(shared)).toBe(100 * 5 + 2 + 40);
  });

  it('refuses each way a workspace can be too large', () => {
    for (const ws of [sized(600), sized(100, 10), sized(50, 0, 900), sized(50, 0, 0, 20)]) {
      expect(pdfExportBlocker(ws)).toContain('too large for the PDF export');
    }
  });
});

describe('GET /api/report/pdf', () => {
  it('answers 413 at once for a 600-process workspace instead of rendering it', async () => {
    await bootstrapOrg(users.aliceOwnerA);
    const actions = await import('@/lib/actions');
    await actions.saveOrg({
      name: 'Org',
      industry: '',
      regulatoryContext: '',
      annualRevenue: 1_000_000,
      employees: 10,
      riskAppetite: 'moderate',
      currency: 'USD',
    });
    const imported = await actions.importCsv(
      Array.from({ length: 600 }, (_, i) => ({ name: `Process ${i}`, dep_applications: 'App A;App B' }))
    );
    expect(imported.created).toBe(600);

    const { GET } = await import('@/app/api/report/pdf/route');
    const started = performance.now();
    const res = await GET();
    const elapsed = performance.now() - started;
    console.log(`[N10] PDF export of 600 processes: http ${res.status} in ${elapsed.toFixed(0)} ms`);
    expect(res.status).toBe(413);
    expect(await res.text()).toContain('Browser print');
    expect(elapsed).toBeLessThan(2000);
  });
});
