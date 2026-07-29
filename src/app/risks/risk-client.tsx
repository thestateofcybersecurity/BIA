'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveRisk, deleteRisk } from '@/lib/actions';
import type {
  RiskEntry,
  Likelihood,
  RiskTreatment,
  RiskStatus,
  RiskBand,
  Tier,
} from '@/lib/domain/types';
import {
  LIKELIHOODS,
  LIKELIHOOD_LABELS,
  LIKELIHOOD_ANCHORS,
  RISK_CATEGORIES,
  RISK_TREATMENTS,
  TREATMENT_LABELS,
  TREATMENT_DESCRIPTIONS,
  RISK_BAND_LABELS,
  RISK_IMPACT_LABELS,
} from '@/lib/domain/constants';
import { Card, btn, StatusPill, TierBadge } from '@/components/ui';
import { suggestRisksWithAi, dismissRiskSuggestion, acceptRiskSuggestion } from '@/lib/actions';
import type { RiskSuggestion } from '@/lib/domain/risk-suggestions';
import { formatCompactCurrency, formatDate } from '@/lib/format';

export interface RiskRow {
  risk: RiskEntry;
  impact: number | null;
  score: number | null;
  band: RiskBand | null;
  topTier: Tier | null;
  exposure24h: number | null;
  affected: { id: string; name: string; tier: Tier | null; assessed: boolean }[];
  unassessedCount: number;
}

const BAND_STYLES: Record<RiskBand, string> = {
  low: 'bg-s0 text-ink-soft',
  medium: 'bg-[#f2d3ae] text-ink',
  high: 'bg-[#c95f24] text-white',
  critical: 'bg-[#8a2210] text-white',
};

const STATUS_LABELS: Record<RiskStatus, string> = {
  open: 'Open',
  treating: 'Treating',
  treated: 'Treated',
  accepted: 'Accepted',
};

function BandChip({ band, score }: { band: RiskBand | null; score: number | null }) {
  if (band == null || score == null) {
    return <StatusPill tone="neutral">Not scorable</StatusPill>;
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${BAND_STYLES[band]}`}
    >
      {RISK_BAND_LABELS[band]} · {score}
    </span>
  );
}

const emptyRisk = (): RiskEntry => ({
  id: '',
  title: '',
  category: RISK_CATEGORIES[0],
  description: '',
  processIds: [],
  dependencies: [],
  likelihood: 2,
  likelihoodRationale: '',
  existingControls: '',
  treatment: null,
  treatmentAction: '',
  owner: '',
  targetDate: null,
  status: 'open',
  updatedAt: '',
});

function RiskEditor({
  initial,
  processes,
  dependencyOptions,
  onClose,
  onSaved,
}: {
  initial: RiskEntry | null;
  processes: { id: string; name: string; tier: Tier | null }[];
  dependencyOptions: string[];
  onClose: () => void;
  onSaved?: () => Promise<void>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<RiskEntry>(initial ?? emptyRisk());
  const [depDraft, setDepDraft] = useState('');

  const set = <K extends keyof RiskEntry>(k: K, v: RiskEntry[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleProcess = (id: string) =>
    set(
      'processIds',
      form.processIds.includes(id)
        ? form.processIds.filter((x) => x !== id)
        : [...form.processIds, id]
    );

  const addDependency = () => {
    const items = depDraft
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !form.dependencies.includes(s));
    if (items.length) set('dependencies', [...form.dependencies, ...items]);
    setDepDraft('');
  };

  return (
    <Card title={initial ? 'Edit risk' : 'New risk'}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            await saveRisk({
              ...form,
              id: form.id || undefined,
              targetDate: form.targetDate || null,
            });
            await onSaved?.();
            router.refresh();
            onClose();
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="r-title">Threat</label>
            <input
              id="r-title"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Ransomware detonation across the claims estate"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="r-category">Category</label>
            <input
              id="r-category"
              list="risk-categories"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            />
            <datalist id="risk-categories">
              {RISK_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="r-owner">Risk owner</label>
            <input
              id="r-owner"
              value={form.owner}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="Accountable for the treatment"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="r-description">How it would play out</label>
            <textarea
              id="r-description"
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="The mechanism and what it takes out, not the consequence: impact comes from the assessments below."
            />
          </div>
        </div>

        <div className="rounded-md border border-line bg-paper/60 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Likelihood
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LIKELIHOODS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => set('likelihood', l as Likelihood)}
                className={`rounded border px-3 py-1.5 text-xs transition-colors ${
                  form.likelihood === l
                    ? 'border-ink bg-ink text-paper'
                    : 'border-line text-ink-soft hover:border-accent hover:text-accent'
                }`}
              >
                {l} · {LIKELIHOOD_LABELS[l]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {LIKELIHOOD_ANCHORS[form.likelihood]}
          </p>
          <input
            className="mt-3 w-full text-sm"
            value={form.likelihoodRationale}
            onChange={(e) => set('likelihoodRationale', e.target.value)}
            placeholder="Why this rating: incident history, threat intelligence, audit findings"
          />
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Processes disrupted · impact is derived from their assessments
          </p>
          {processes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              Add processes first; a risk with nothing attached cannot be scored.
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              {processes.map((p) => {
                const on = form.processIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProcess(p.id)}
                    className={`flex items-center gap-2 rounded border px-2.5 py-1 text-xs transition-colors ${
                      on
                        ? 'border-accent bg-accent-soft text-ink'
                        : 'border-line text-ink-soft hover:border-accent'
                    }`}
                  >
                    <TierBadge tier={p.tier} />
                    {p.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Dependencies attacked
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {form.dependencies.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 rounded bg-s0 px-2 py-0.5 text-xs text-ink-soft"
              >
                {d}
                <button
                  type="button"
                  className="text-ink-faint hover:text-bad"
                  onClick={() => set('dependencies', form.dependencies.filter((x) => x !== d))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 text-sm"
              list="dependency-options"
              value={depDraft}
              onChange={(e) => setDepDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addDependency();
                }
              }}
              placeholder="Fiserv, PolicyCore, Rochester HQ"
            />
            <button type="button" className={btn.secondary} onClick={addDependency}>
              Add
            </button>
          </div>
          <datalist id="dependency-options">
            {dependencyOptions.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="r-controls">Controls already in place</label>
          <textarea
            id="r-controls"
            rows={2}
            value={form.existingControls}
            onChange={(e) => set('existingControls', e.target.value)}
            placeholder="What already reduces this: segmentation, immutable backups, contractual SLAs, tested failover"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="r-treatment">Treatment</label>
            <select
              id="r-treatment"
              value={form.treatment ?? ''}
              onChange={(e) =>
                set('treatment', e.target.value === '' ? null : (e.target.value as RiskTreatment))
              }
            >
              <option value="">Not decided</option>
              {RISK_TREATMENTS.map((t) => (
                <option key={t} value={t}>
                  {TREATMENT_LABELS[t]}
                </option>
              ))}
            </select>
            {form.treatment && (
              <p className="text-[11px] leading-snug text-ink-muted">
                {TREATMENT_DESCRIPTIONS[form.treatment]}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="r-status">Status</label>
            <select
              id="r-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value as RiskStatus)}
            >
              {(Object.keys(STATUS_LABELS) as RiskStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="r-action">Treatment action</label>
            <input
              id="r-action"
              value={form.treatmentAction}
              onChange={(e) => set('treatmentAction', e.target.value)}
              placeholder="What will be done, by whom"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="r-date">Target date</label>
            <input
              id="r-date"
              type="date"
              value={form.targetDate ?? ''}
              onChange={(e) => set('targetDate', e.target.value || null)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className={btn.primary} disabled={pending}>
            {pending ? 'Saving…' : 'Save risk'}
          </button>
          <button type="button" className={btn.secondary} onClick={onClose}>
            Cancel
          </button>
          {initial && (
            <button
              type="button"
              className={`${btn.small} ml-auto`}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteRisk(initial.id);
                  router.refresh();
                  onClose();
                })
              }
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

export function RiskClient({
  rows,
  processes,
  dependencyOptions,
  matrix,
  currency,
  suggestions,
  aiAvailable,
}: {
  rows: RiskRow[];
  processes: { id: string; name: string; tier: Tier | null }[];
  dependencyOptions: string[];
  matrix: number[][];
  currency: string;
  suggestions: RiskSuggestion[];
  aiAvailable: boolean;
}) {
  const [editing, setEditing] = useState<RiskEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<RiskSuggestion[] | null>(null);
  const [suggesting, startSuggest] = useTransition();
  const [suggestError, setSuggestError] = useState<string | null>(null);
  // Local only until the server confirms; the decision itself is persisted so
  // a dismissed suggestion does not reappear on the next load.
  const [decided, setDecided] = useState<string[]>([]);
  const [fromSuggestion, setFromSuggestion] = useState<RiskSuggestion | null>(null);

  // A fresh AI run replaces the server-rendered list, since the action returns
  // every open suggestion rather than only that run's additions.
  const allSuggestions = [
    ...(aiSuggestions ?? suggestions.filter((s) => s.source === 'ai')),
    ...suggestions.filter((s) => s.source !== 'ai'),
  ].filter((s) => !decided.includes(s.id));

  const snapshot = (s: RiskSuggestion) => ({
    id: s.id,
    title: s.title,
    category: s.category,
    description: s.description,
    processIds: s.processIds,
    dependencies: s.dependencies,
    basis: s.basis,
  });

  const dismiss = (s: RiskSuggestion) => {
    setDecided((d) => [...d, s.id]);
    void dismissRiskSuggestion(snapshot(s)).catch(() =>
      // Put it back rather than pretend it was dismissed.
      setDecided((d) => d.filter((id) => id !== s.id))
    );
  };

  /** A suggestion opens the editor pre-filled; likelihood stays for the human. */
  const startFromSuggestion = (s: RiskSuggestion) => {
    setCreating(false);
    setFromSuggestion(s);
    setEditing({
      ...emptyRisk(),
      title: s.title,
      category: s.category,
      description: s.description,
      processIds: s.processIds,
      dependencies: s.dependencies,
      likelihoodRationale: '',
    });
  };

  const maxCell = Math.max(1, ...matrix.flat());

  return (
    <div className="flex flex-col gap-6">
      {(creating || editing) && (
        <RiskEditor
          initial={editing}
          processes={processes}
          dependencyOptions={dependencyOptions}
          onClose={() => {
            setEditing(null);
            setCreating(false);
            setFromSuggestion(null);
          }}
          onSaved={
            fromSuggestion
              ? async () => {
                  const s = fromSuggestion;
                  setDecided((d) => [...d, s.id]);
                  await acceptRiskSuggestion(snapshot(s));
                }
              : undefined
          }
        />
      )}

      {!creating && !editing && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btn.primary} onClick={() => setCreating(true)}>
            Add risk
          </button>
          {aiAvailable && (
            <button
              type="button"
              className={btn.secondary}
              disabled={suggesting}
              onClick={() =>
                startSuggest(async () => {
                  setSuggestError(null);
                  try {
                    setAiSuggestions(await suggestRisksWithAi());
                  } catch (e) {
                    setSuggestError(e instanceof Error ? e.message : 'Suggestion failed.');
                  }
                })
              }
            >
              {suggesting ? 'Thinking…' : 'Suggest more with Claude'}
            </button>
          )}
          {suggestError && <span className="text-sm text-bad">{suggestError}</span>}
        </div>
      )}

      {!creating && !editing && allSuggestions.length > 0 && (
        <Card
          title="Suggested risks"
          subtitle="Derived from your inventory, gaps, and notes. Nothing is registered until you add it."
        >
          <div className="flex flex-col gap-3">
            {allSuggestions.map((s) => (
              <div key={s.id} className="rounded-md border border-line bg-paper/60 p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {s.title}
                      <StatusPill tone={s.source === 'ai' ? 'warn' : 'neutral'}>
                        {s.source === 'ai' ? 'Claude' : s.category}
                      </StatusPill>
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">{s.description}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      <span className="font-mono uppercase tracking-wider">Why</span> {s.basis}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      className={btn.small}
                      onClick={() => startFromSuggestion(s)}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      className="text-xs text-ink-faint hover:text-ink"
                      onClick={() => dismiss(s)}
                    >
                      Dismiss
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Suggestions stop once a registered risk names the same dependency, and anything
            you add or dismiss stays gone, including across sessions, so this list
            shrinks as the register fills. Likelihood is never suggested: that judgement is
            yours, and impact derives itself from the processes attached.
          </p>
        </Card>
      )}

      {rows.length > 0 && (
        <Card
          title="Risk matrix"
          subtitle="Likelihood against impact inherited from the BIA"
        >
          <div className="overflow-x-auto">
            <table className="text-xs">
              <tbody>
                {[4, 3, 2, 1, 0].map((l) => (
                  <tr key={l}>
                    <td className="whitespace-nowrap py-1 pr-3 text-right font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                      {l} {LIKELIHOOD_LABELS[l as Likelihood]}
                    </td>
                    {[0, 1, 2, 3, 4].map((i) => {
                      const count = matrix[l][i];
                      const band = RISK_BAND_LABELS[
                        l * i >= 12 ? 'critical' : l * i >= 8 ? 'high' : l * i >= 4 ? 'medium' : 'low'
                      ];
                      return (
                        <td key={i} className="p-1">
                          <div
                            title={`${band} · likelihood ${l} x impact ${i} = ${l * i}`}
                            className={`flex h-11 w-14 items-center justify-center rounded font-mono text-sm ${
                              BAND_STYLES[
                                l * i >= 12 ? 'critical' : l * i >= 8 ? 'high' : l * i >= 4 ? 'medium' : 'low'
                              ]
                            } ${count === 0 ? 'opacity-25' : ''}`}
                            style={count > 0 ? { outline: `2px solid rgba(27,36,48,${0.15 + 0.5 * (count / maxCell)})` } : undefined}
                          >
                            {count || ''}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr>
                  <td />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <td
                      key={i}
                      className="px-1 pt-1 text-center font-mono text-[10px] uppercase tracking-wider text-ink-muted"
                    >
                      {i} {RISK_IMPACT_LABELS[i as 0 | 1 | 2 | 3 | 4]}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink-muted">
            Impact is the criticality tier of the most critical process each risk disrupts, so a
            threat cannot be scored gentler than the assessment of what it takes out.
          </p>
        </Card>
      )}

      <Card
        title="Risk register"
        subtitle={
          rows.length === 0
            ? 'Nothing registered yet'
            : `${rows.length} risk${rows.length === 1 ? '' : 's'}, highest scoring first`
        }
      >
        {rows.length === 0 ? (
          <p className="text-sm text-ink-muted">
            The BIA says how bad a disruption would be. The register says what could cause one.
            Start with the threats that have actually happened in your sector.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {['Threat', 'Rating', 'Likelihood × impact', 'Processes', 'Treatment', ''].map(
                    (h, i) => (
                      <th
                        key={i}
                        className="pb-2 pr-3 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ risk, impact, score, band, affected, exposure24h, unassessedCount }) => (
                  <tr key={risk.id} className="border-b border-line/60 align-top last:border-0">
                    <td className="py-3 pr-3">
                      <p className="font-medium">{risk.title}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                        {risk.category}
                        {risk.owner ? ` · ${risk.owner}` : ''}
                      </p>
                      {risk.description && (
                        <p className="mt-1 max-w-sm text-xs text-ink-muted">{risk.description}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <BandChip band={band} score={score} />
                      {exposure24h != null && exposure24h > 0 && (
                        <p className="tnum mt-1 whitespace-nowrap font-mono text-[10px] text-ink-muted">
                          {formatCompactCurrency(exposure24h, currency)} / 24h
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <p className="tnum whitespace-nowrap font-mono text-xs text-ink-soft">
                        {risk.likelihood} × {impact ?? '·'}
                      </p>
                      <p className="text-[10px] text-ink-muted">
                        {LIKELIHOOD_LABELS[risk.likelihood]}
                      </p>
                      {unassessedCount > 0 && (
                        <p className="text-[10px] text-warn">
                          {unassessedCount} unassessed process
                          {unassessedCount === 1 ? '' : 'es'}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs text-ink-soft">
                      {affected.length === 0 ? (
                        <span className="text-warn">None linked</span>
                      ) : (
                        affected.map((a) => a.name).join(', ')
                      )}
                      {risk.dependencies.length > 0 && (
                        <p className="mt-1 text-[10px] text-ink-muted">
                          via {risk.dependencies.join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <StatusPill
                        tone={
                          risk.status === 'treated'
                            ? 'ok'
                            : risk.status === 'open'
                              ? 'warn'
                              : 'neutral'
                        }
                      >
                        {STATUS_LABELS[risk.status]}
                      </StatusPill>
                      <p className="mt-1 text-xs text-ink-soft">
                        {risk.treatment ? TREATMENT_LABELS[risk.treatment] : 'No treatment decided'}
                      </p>
                      {risk.treatmentAction && (
                        <p className="text-[10px] text-ink-muted">{risk.treatmentAction}</p>
                      )}
                      {risk.targetDate && (
                        <p className="font-mono text-[10px] text-ink-muted">
                          due {formatDate(risk.targetDate)}
                        </p>
                      )}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        className={btn.small}
                        onClick={() => {
                          setCreating(false);
                          setEditing(risk);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
