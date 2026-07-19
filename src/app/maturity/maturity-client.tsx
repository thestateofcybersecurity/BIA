'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveMaturityAnswers } from '@/lib/actions';
import type { MaturityAssessment, MaturityLevel } from '@/lib/domain/types';
import { MATURITY_DOMAINS, MATURITY_LEVELS, scoreMaturity } from '@/lib/domain/maturity';
import { Card, btn } from '@/components/ui';
import { MaturityRadarChart } from '@/components/charts';

export function MaturityClient({ initial }: { initial: MaturityAssessment | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<Record<string, MaturityLevel | null>>(
    initial?.answers ?? {}
  );
  const [openDomain, setOpenDomain] = useState<string>(MATURITY_DOMAINS[0].id);

  const result = useMemo(
    () => scoreMaturity({ answers, updatedAt: '' }),
    [answers]
  );

  const radarData = result.domains
    .filter((d) => d.score != null)
    .map((d) => ({ domain: d.name, score: d.score! }));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="flex flex-col gap-3 lg:col-span-3">
        {MATURITY_DOMAINS.map((domain) => {
          const ds = result.domains.find((d) => d.domainId === domain.id)!;
          const open = openDomain === domain.id;
          return (
            <Card key={domain.id} className="!p-0">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                onClick={() => setOpenDomain(open ? '' : domain.id)}
              >
                <div>
                  <h3 className="font-display text-base font-semibold">{domain.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {domain.clause}
                    {domain.weight !== 1 && ' · weighted 1.5x'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum font-mono text-sm text-ink-soft">
                    {ds.score != null ? `${ds.score.toFixed(1)}/5` : `${ds.answered}/${ds.total}`}
                  </span>
                  <span className="text-ink-faint">{open ? '−' : '+'}</span>
                </div>
              </button>
              {open && (
                <div className="border-t border-line px-5 py-4">
                  <div className="flex flex-col gap-4">
                    {domain.questions.map((q) => (
                      <div key={q.id} className="grid gap-2 sm:grid-cols-[1fr_190px]">
                        <div>
                          <p className="text-sm font-medium">{q.label}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{q.help}</p>
                        </div>
                        <select
                          aria-label={q.label}
                          value={answers[q.id] ?? ''}
                          onChange={(e) => {
                            setSaved(false);
                            setAnswers((a) => ({
                              ...a,
                              [q.id]: Number(e.target.value) as MaturityLevel,
                            }));
                          }}
                        >
                          <option value="" disabled>
                            Not answered
                          </option>
                          {([0, 1, 2, 3, 4, 5] as MaturityLevel[]).map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl} · {MATURITY_LEVELS[lvl].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        <div className="flex items-center gap-3">
          <button
            className={btn.primary}
            disabled={pending}
            onClick={() =>
              start(async () => {
                await saveMaturityAnswers(answers);
                setSaved(true);
                router.refresh();
              })
            }
          >
            {pending ? 'Saving…' : 'Save answers'}
          </button>
          {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card title="Overall maturity">
          <div className="flex items-baseline gap-2">
            <span className="tnum font-display text-5xl font-semibold">
              {result.overall != null ? result.overall.toFixed(1) : '·'}
            </span>
            <span className="font-mono text-sm text-ink-muted">/ 5</span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {result.answered} of {result.total} questions answered · weighted across domains
          </p>
          {radarData.length >= 3 && (
            <div className="mt-2">
              <MaturityRadarChart data={radarData} />
            </div>
          )}
        </Card>

        <Card title="Capability scale" subtitle="Every answer uses these anchors">
          <ul className="flex flex-col gap-2">
            {([0, 1, 2, 3, 4, 5] as MaturityLevel[]).map((lvl) => (
              <li key={lvl} className="flex items-start gap-3 text-sm">
                <span className="tnum mt-0.5 inline-flex h-5 w-6 shrink-0 items-center justify-center rounded bg-s0 font-mono text-xs text-ink-soft">
                  {lvl}
                </span>
                <span className="text-ink-soft">
                  <span className="font-medium text-ink">{MATURITY_LEVELS[lvl].label}.</span>{' '}
                  {MATURITY_LEVELS[lvl].description}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {result.roadmap.length > 0 && (
          <Card title="Suggested roadmap" subtitle="Weakest domains first">
            <ol className="flex flex-col gap-2">
              {result.roadmap.slice(0, 4).map((d, i) => (
                <li key={d.domainId} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <span className="flex-1">{d.name}</span>
                  <span className="tnum font-mono text-xs text-ink-muted">
                    {d.score!.toFixed(1)}/5
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}
