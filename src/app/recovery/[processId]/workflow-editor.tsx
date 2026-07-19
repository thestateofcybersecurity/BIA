'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { saveWorkflow } from '@/lib/actions';
import type { RecoveryWorkflow, RecoveryStep, DependencyMap } from '@/lib/domain/types';
import { DEPENDENCY_CLASSES, DEPENDENCY_LABELS } from '@/lib/domain/constants';
import { Card, btn, StatusPill } from '@/components/ui';
import { formatHours } from '@/lib/format';

const emptyDeps = (): DependencyMap => ({
  people: [], applications: [], equipment: [], facilities: [], suppliers: [], data: [],
});

const newStep = (): RecoveryStep => ({
  id: nanoid(8),
  description: '',
  team: '',
  durationHours: 1,
  dependencies: emptyDeps(),
  alternateStaff: [],
});

const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function WorkflowEditor({
  processId,
  initial,
  rtoTargetHours,
}: {
  processId: string;
  initial: RecoveryWorkflow | null;
  rtoTargetHours: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [steps, setSteps] = useState<RecoveryStep[]>(initial?.steps ?? []);
  const [open, setOpen] = useState<string | null>(null);

  const update = (id: string, patch: Partial<RecoveryStep>) => {
    setSaved(false);
    setSteps((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const move = (i: number, dir: -1 | 1) => {
    setSaved(false);
    setSteps((ss) => {
      const next = [...ss];
      const j = i + dir;
      if (j < 0 || j >= next.length) return ss;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const total = steps.reduce((s, x) => s + (x.durationHours || 0), 0);
  const over = rtoTargetHours != null && total > rtoTargetHours;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="tnum font-mono text-sm text-ink-soft">
          {steps.length} steps · {formatHours(total)} sequential time
        </span>
        {rtoTargetHours != null &&
          (over ? (
            <StatusPill tone="bad">Exceeds RTO target {formatHours(rtoTargetHours)}</StatusPill>
          ) : (
            <StatusPill tone="ok">Within RTO target {formatHours(rtoTargetHours)}</StatusPill>
          ))}
        {rtoTargetHours == null && (
          <StatusPill tone="neutral">No RTO target set for comparison</StatusPill>
        )}
      </div>

      {steps.map((s, i) => (
        <Card key={s.id} className="relative">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="tnum inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-sm text-paper">
                {i + 1}
              </span>
              <button type="button" aria-label="Move up" className="text-xs text-ink-faint hover:text-accent disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
              <button type="button" aria-label="Move down" className="text-xs text-ink-faint hover:text-accent disabled:opacity-30" disabled={i === steps.length - 1} onClick={() => move(i, 1)}>▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_110px]">
                <div className="flex flex-col gap-1">
                  <label>Step description</label>
                  <input
                    value={s.description}
                    onChange={(e) => update(s.id, { description: e.target.value })}
                    placeholder="Confirm database failover to standby region"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label>Responsible team</label>
                  <input
                    value={s.team}
                    onChange={(e) => update(s.id, { team: e.target.value })}
                    placeholder="IT Infrastructure"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label>Duration (h)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="tnum"
                    value={s.durationHours}
                    onChange={(e) => update(s.id, { durationHours: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                >
                  {open === s.id ? 'Hide' : 'Show'} dependencies &amp; alternates
                </button>
                <button
                  type="button"
                  className="text-xs text-ink-faint hover:text-bad"
                  onClick={() => { setSaved(false); setSteps((ss) => ss.filter((x) => x.id !== s.id)); }}
                >
                  Remove step
                </button>
              </div>

              {open === s.id && (
                <div className="mt-3 grid gap-3 rounded-md border border-line bg-paper/60 p-3 sm:grid-cols-2">
                  {DEPENDENCY_CLASSES.map((cls) => (
                    <div key={cls} className="flex flex-col gap-1">
                      <label>{DEPENDENCY_LABELS[cls]}</label>
                      <input
                        className="text-xs"
                        value={s.dependencies[cls].join(', ')}
                        placeholder="Comma separated"
                        onChange={(e) =>
                          update(s.id, {
                            dependencies: { ...s.dependencies, [cls]: parseList(e.target.value) },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label>Alternate staff</label>
                    <input
                      className="text-xs"
                      value={s.alternateStaff.join(', ')}
                      placeholder="Who can execute this step if the primary team is unavailable"
                      onChange={(e) => update(s.id, { alternateStaff: parseList(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn.secondary}
          onClick={() => { setSaved(false); setSteps((ss) => [...ss, newStep()]); }}
        >
          + Add step
        </button>
        <button
          className={btn.primary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveWorkflow({ processId, steps });
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? 'Saving…' : 'Save workflow'}
        </button>
        {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
      </div>
    </div>
  );
}
