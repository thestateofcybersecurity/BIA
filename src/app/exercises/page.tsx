import Link from 'next/link';
import { loadWorkspace } from '@/lib/actions';
import { CATALOG } from '@/lib/domain/scenarios';
import { deriveAll } from '@/lib/domain/scoring';
import { PageHeader, Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ExercisesPage() {
  const ws = await loadWorkspace();
  const derived = deriveAll(ws);
  const tier1 = [...derived.values()].filter((d) => d.tier === 1).length;

  return (
    <>
      <PageHeader
        kicker="Step 07"
        title="Tabletop exercises"
        intro={`Each scenario is generated from your assessment data: it names your actual critical processes, dependency concentrations, and known recovery gaps, and its evaluation criteria map back to the maturity domains. ${
          tier1 > 0
            ? `Your workspace currently has ${tier1} Tier 1 process${tier1 === 1 ? '' : 'es'} to exercise against.`
            : 'Complete impact assessments first to get fully tailored exercises.'
        }`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CATALOG.map((s) => (
          <Link key={s.id} href={`/exercises/${s.id}`} className="group">
            <Card className="h-full transition-colors group-hover:border-accent">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
                {s.category}
              </p>
              <h3 className="mt-1 font-display text-lg font-semibold group-hover:text-accent">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.summary}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
