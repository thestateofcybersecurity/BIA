'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveAssessment, approveAssessment } from '@/lib/actions';
import type {
  BusinessProcess,
  ImpactAssessment,
  OrgProfile,
  Horizon,
  Severity,
  RatedCategory,
  MtpdValue,
} from '@/lib/domain/types';
import {
  HORIZONS,
  HORIZON_LABELS,
  RATED_CATEGORIES,
  CATEGORY_LABELS,
  SEVERITY_ANCHORS,
  SEVERITY_LABELS,
  MTPD_LABELS,
  TIER_LABELS,
} from '@/lib/domain/constants';
import {
  financialSeverity,
  deriveProcess,
  enforceMonotonic,
  enforceMonotonicLoss,
} from '@/lib/domain/scoring';
import { Card, btn, SEVERITY_BG, TierBadge } from '@/components/ui';
import { CostCurveChart } from '@/components/charts';
import { formatCurrency } from '@/lib/format';

type Ratings = ImpactAssessment['ratings'];
type Losses = ImpactAssessment['financialLoss'];

const emptyHorizons = <T,>(v: T): Record<Horizon, T> => ({
  h4: v, h24: v, d3: v, w1: v, m1: v,
});

export function AssessmentForm({
  process,
  initial,
  org,
}: {
  process: BusinessProcess;
  initial: ImpactAssessment | null;
  org: OrgProfile | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  const [losses, setLosses] = useState<Losses>(
    initial?.financialLoss ?? emptyHorizons<number | null>(null)
  );
  const [ratings, setRatings] = useState<Ratings>(
    initial?.ratings ?? {
      operational: emptyHorizons<Severity | null>(null),
      reputational: emptyHorizons<Severity | null>(null),
      legal: emptyHorizons<Severity | null>(null),
      safety: emptyHorizons<Severity | null>(null),
    }
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [override, setOverride] = useState(initial?.mtpdOverride ?? null);
  const [focusCat, setFocusCat] = useState<RatedCategory>('operational');
  const [approver, setApprover] = useState(process.owner || '');
  const [dirty, setDirty] = useState(false);

  const assessment: ImpactAssessment = useMemo(
    () => ({
      id: initial?.id ?? 'draft',
      processId: process.id,
      financialLoss: losses,
      ratings,
      mtpdOverride: override,
      notes,
      updatedAt: '',
    }),
    [initial?.id, process.id, losses, ratings, override, notes]
  );

  const derived = useMemo(
    () => deriveProcess(process, assessment, org),
    [process, assessment, org]
  );

  const setRating = (cat: RatedCategory, h: Horizon, v: Severity) => {
    setSaved(false);
    setDirty(true);
    setRatings((r) => ({ ...r, [cat]: enforceMonotonic(r[cat], h, v) }));
  };

  const setLoss = (h: Horizon, raw: string) => {
    setSaved(false);
    setDirty(true);
    const v = raw === '' ? null : Math.max(0, Number(raw));
    setLosses((l) =>
      v == null ? { ...l, [h]: null } : enforceMonotonicLoss(l, h, v)
    );
  };

  const curveData = HORIZONS.filter((h) => losses[h] != null).map((h) => ({
    horizon: HORIZON_LABELS[h],
    cost: losses[h]!,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Card
          title="Financial impact"
          subtitle={
            org
              ? `Cumulative loss in ${org.currency} at each horizon: revenue, productivity, extra costs, penalties combined. Severity is derived from bands scaled to ${org.name}'s revenue.`
              : 'Set up the organization profile to derive financial severity from these amounts.'
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {HORIZONS.map((h) => {
              const sev = losses[h] != null && org ? financialSeverity(losses[h]!, org) : null;
              return (
                <div key={h} className="flex flex-col gap-1">
                  <label htmlFor={`loss-${h}`}>{HORIZON_LABELS[h]}</label>
                  <input
                    id={`loss-${h}`}
                    type="number"
                    min={0}
                    className="tnum"
                    value={losses[h] ?? ''}
                    onChange={(e) => setLoss(h, e.target.value)}
                    placeholder="0"
                  />
                  <span
                    className={`self-start rounded px-1.5 py-0.5 font-mono text-[10px] ${
                      sev != null ? SEVERITY_BG[sev] : 'text-ink-faint'
                    }`}
                  >
                    {sev != null ? `sev ${sev} · ${SEVERITY_LABELS[sev]}` : '· ·'}
                  </span>
                </div>
              );
            })}
          </div>
          {curveData.length >= 2 && (
            <div className="mt-4">
              <CostCurveChart data={curveData} currency={org?.currency ?? 'USD'} height={170} />
            </div>
          )}
        </Card>

        <Card
          title="Qualitative impact"
          subtitle="Pick the severity that matches the described condition. Click a category name to see its anchor descriptions."
        >
          <div className="overflow-x-auto">
            <table className="w-full border-separate" style={{ borderSpacing: '3px' }}>
              <thead>
                <tr>
                  <th className="pr-2 text-left font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                    Category
                  </th>
                  {HORIZONS.map((h) => (
                    <th
                      key={h}
                      className="px-1 text-center font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                    >
                      {HORIZON_LABELS[h]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RATED_CATEGORIES.map((cat) => (
                  <tr key={cat}>
                    <td className="pr-2">
                      <button
                        type="button"
                        onClick={() => setFocusCat(cat)}
                        className={`whitespace-nowrap rounded px-2 py-1 text-left text-sm transition-colors ${
                          focusCat === cat
                            ? 'bg-accent-soft font-medium text-ink'
                            : 'text-ink-soft hover:text-accent'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    </td>
                    {HORIZONS.map((h) => (
                      <td key={h} className="px-1 text-center">
                        <select
                          aria-label={`${CATEGORY_LABELS[cat]} at ${HORIZON_LABELS[h]}`}
                          value={ratings[cat][h] ?? ''}
                          onFocus={() => setFocusCat(cat)}
                          onChange={(e) =>
                            setRating(cat, h, Number(e.target.value) as Severity)
                          }
                          className={`tnum !w-16 text-center font-mono text-sm ${
                            ratings[cat][h] != null
                              ? SEVERITY_BG[ratings[cat][h] as Severity]
                              : ''
                          }`}
                        >
                          <option value="" disabled>
                            ·
                          </option>
                          {[0, 1, 2, 3, 4].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-md border border-line bg-paper/60 p-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
              {CATEGORY_LABELS[focusCat]} · severity anchors
            </p>
            <ul className="flex flex-col gap-1.5">
              {([0, 1, 2, 3, 4] as Severity[]).map((s) => (
                <li key={s} className="flex items-start gap-3 text-sm">
                  <span
                    className={`tnum mt-0.5 inline-flex h-5 w-7 shrink-0 items-center justify-center rounded font-mono text-xs ${SEVERITY_BG[s]}`}
                  >
                    {s}
                  </span>
                  <span className="text-ink-soft">{SEVERITY_ANCHORS[focusCat][s]}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card title="Notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setSaved(false); setDirty(true); }}
            placeholder="Assumptions, sources, workshop attendees, follow-ups"
            className="w-full"
          />
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card title="Derived outcomes" subtitle="Computed live from your ratings">
          <dl className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-ink-soft">MTPD</dt>
              <dd className="font-mono text-sm">
                {derived.mtpd ? MTPD_LABELS[derived.mtpd] : 'Incomplete'}
                {derived.mtpdOverridden && (
                  <span className="ml-1 text-[10px] text-warn">(override)</span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-ink-soft">Criticality tier</dt>
              <dd>
                <TierBadge tier={derived.tier} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-ink-soft">Priority score</dt>
              <dd className="tnum font-mono text-sm">
                {derived.priority ?? '·'}
                <span className="text-ink-faint"> / 100</span>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-ink-soft">24h downtime cost</dt>
              <dd className="tnum font-mono text-sm">
                {derived.cost24h != null && org
                  ? formatCurrency(derived.cost24h, org.currency)
                  : '·'}
              </dd>
            </div>
          </dl>
          {derived.tier && (
            <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted">
              {TIER_LABELS[derived.tier]}. Derived from the earliest horizon where any
              category reaches severity 4. Complete all cells for a final result.
            </p>
          )}
        </Card>

        <Card
          title="MTPD override"
          subtitle="Use only when the derived value is demonstrably wrong; overrides are flagged in the report"
        >
          {override ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="ov-value">Overridden MTPD</label>
                <select
                  id="ov-value"
                  value={override.value}
                  onChange={(e) => {
                    setSaved(false); setDirty(true);
                    setOverride({ ...override, value: e.target.value as MtpdValue });
                  }}
                >
                  {(Object.keys(MTPD_LABELS) as MtpdValue[]).map((m) => (
                    <option key={m} value={m}>
                      {MTPD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="ov-just">Justification (required)</label>
                <textarea
                  id="ov-just"
                  rows={2}
                  value={override.justification}
                  onChange={(e) => {
                    setSaved(false); setDirty(true);
                    setOverride({ ...override, justification: e.target.value });
                  }}
                />
              </div>
              <button
                type="button"
                className={btn.small}
                onClick={() => { setSaved(false); setDirty(true); setOverride(null); }}
              >
                Remove override
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={btn.secondary}
              onClick={() => {
                setSaved(false); setDirty(true);
                setOverride({ value: derived.mtpdDerived ?? 'beyond', justification: '' });
              }}
            >
              Override derived MTPD
            </button>
          )}
        </Card>

        <Card
          title="Owner sign-off"
          subtitle="Editing the assessment clears the sign-off; it must be re-approved"
        >
          {initial?.approvedBy && !dirty ? (
            <p className="text-sm text-ink-soft">
              Approved by <span className="font-medium text-ink">{initial.approvedBy}</span>
              {initial.approvedAt && (
                <span className="text-ink-muted">
                  {' '}on {new Date(initial.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-warn">
                {dirty ? 'Unsaved changes; save before approving' : 'Not yet approved'}
              </p>
              <div className="flex gap-2">
                <input
                  className="flex-1 text-sm"
                  value={approver}
                  placeholder="Approver name"
                  onChange={(e) => setApprover(e.target.value)}
                />
                <button
                  className={btn.secondary}
                  disabled={pending || dirty || !approver.trim() || !initial || !derived.assessmentComplete}
                  onClick={() =>
                    start(async () => {
                      await approveAssessment(process.id, approver);
                      router.refresh();
                    })
                  }
                >
                  Approve
                </button>
              </div>
              {initial && !derived.assessmentComplete && (
                <p className="text-xs text-ink-muted">Complete every cell before approving.</p>
              )}
            </div>
          )}
        </Card>

        <div className="flex items-center gap-3">
          <button
            className={btn.primary}
            disabled={pending || (override != null && override.justification.trim() === '')}
            onClick={() =>
              start(async () => {
                await saveAssessment({
                  processId: process.id,
                  financialLoss: losses,
                  ratings,
                  mtpdOverride: override,
                  notes,
                });
                setSaved(true);
                setDirty(false);
                router.refresh();
              })
            }
          >
            {pending ? 'Saving…' : 'Save assessment'}
          </button>
          {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
        </div>
      </div>
    </div>
  );
}
