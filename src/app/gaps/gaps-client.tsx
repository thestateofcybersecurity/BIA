'use client';

import { Fragment, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveObjectives, saveRemediation } from '@/lib/actions';
import type {
  RecoveryObjectives,
  GapRemediation,
  MtpdValue,
  Tier,
  GapStatus,
  RecoveryStrategy,
} from '@/lib/domain/types';
import {
  MTPD_LABELS,
  RECOVERY_STRATEGIES,
  STRATEGY_LABELS,
  STRATEGY_DESCRIPTIONS,
} from '@/lib/domain/constants';
import { validateRto, computeGaps, type GapInfo } from '@/lib/domain/scoring';
import { Card, btn, StatusPill, TierBadge } from '@/components/ui';
import { formatHours, formatCompactCurrency, formatCurrency } from '@/lib/format';

interface ProcessRow {
  id: string;
  name: string;
  mtpd: MtpdValue | null;
  tier: Tier | null;
  /** Extra loss from restoring at the achievable time instead of the target. */
  exposure: Record<'rto' | 'rpo', number | null>;
}

const num = (v: string): number | null => (v === '' ? null : Math.max(0, Number(v)));

function ObjectivesEditor({
  process,
  initial,
  onDone,
}: {
  process: ProcessRow;
  initial: RecoveryObjectives | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    rtoTargetHours: initial?.rtoTargetHours ?? null,
    rpoTargetHours: initial?.rpoTargetHours ?? null,
    mbcoPercent: initial?.mbcoPercent ?? null,
    rtoAchievableHours: initial?.rtoAchievableHours ?? null,
    rpoAchievableHours: initial?.rpoAchievableHours ?? null,
    wrtHours: initial?.wrtHours ?? null,
    dataLossNotes: initial?.dataLossNotes ?? '',
  });

  const validation = validateRto(form.rtoTargetHours, process.mtpd, form.wrtHours);
  const tone =
    validation.status === 'ok' ? 'ok' : validation.status === 'warn' ? 'warn' : validation.status === 'violation' ? 'bad' : 'neutral';

  const fields: [string, keyof typeof form, string][] = [
    ['RTO target (h)', 'rtoTargetHours', 'How fast the business needs it back'],
    ['RTO achievable (h)', 'rtoAchievableHours', 'What current capability delivers'],
    ['WRT (h)', 'wrtHours', 'Work Recovery Time: backlog catch-up after systems are restored'],
    ['RPO target (h)', 'rpoTargetHours', 'Tolerable data loss window'],
    ['RPO achievable (h)', 'rpoAchievableHours', 'Current backup/replication reality'],
    ['MBCO (%)', 'mbcoPercent', 'Minimum service level during recovery'],
  ];

  return (
    <div className="rounded-md border border-line bg-paper/60 p-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {fields.map(([label, key, help]) => (
          <div key={key} className="flex flex-col gap-1">
            <label title={help}>{label}</label>
            <input
              type="number"
              min={0}
              className="tnum"
              value={(form[key] as number | null) ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [key]: num(e.target.value) }))}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1">
        <label>Data loss tolerance notes</label>
        <input
          value={form.dataLossNotes}
          onChange={(e) => setForm((f) => ({ ...f, dataLossNotes: e.target.value }))}
          placeholder="What data is at stake and how it is protected today"
        />
      </div>
      <div className={`mt-3 rounded px-3 py-2 text-xs ${
        tone === 'bad' ? 'bg-bad/10 text-bad' : tone === 'warn' ? 'bg-warn/10 text-warn' : tone === 'ok' ? 'bg-ok/10 text-ok' : 'bg-s0 text-ink-muted'
      }`}>
        {validation.message}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          className={btn.primary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveObjectives({ processId: process.id, ...form });
              router.refresh();
              onDone();
            })
          }
        >
          {pending ? 'Saving…' : 'Save objectives'}
        </button>
        <button className={btn.secondary} onClick={onDone}>
          Close
        </button>
      </div>
    </div>
  );
}

function RemediationEditor({
  gap,
  processName,
  initial,
  exposure,
  currency,
}: {
  gap: GapInfo;
  processName: string;
  initial: GapRemediation | null;
  exposure: number | null;
  currency: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    owner: initial?.owner ?? '',
    action: initial?.action ?? '',
    status: (initial?.status ?? 'open') as GapStatus,
    strategy: (initial?.strategy ?? null) as RecoveryStrategy | null,
    estimatedCost: initial?.estimatedCost ?? null,
    targetDate: initial?.targetDate ?? '',
  });
  const [dirty, setDirty] = useState(false);
  const change = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const cost = form.estimatedCost;
  const worthIt = cost != null && exposure != null && exposure > 0 ? cost < exposure : null;

  return (
    <tr className="border-b border-line/60 align-top last:border-0">
      <td className="py-3 pr-3">
        <p className="text-sm font-medium">{processName}</p>
        <p className="font-mono text-[10px] uppercase text-ink-muted">{gap.kind}</p>
      </td>
      <td className="tnum whitespace-nowrap py-3 pr-3 font-mono text-xs text-ink-soft">
        {formatHours(gap.targetHours)} → {formatHours(gap.achievableHours)}
      </td>
      <td className="py-3 pr-3">
        <StatusPill tone={gap.severity === 'high' ? 'bad' : gap.severity === 'medium' ? 'warn' : 'neutral'}>
          +{formatHours(gap.gapHours)} {gap.severity}
        </StatusPill>
        <p className="tnum mt-1 whitespace-nowrap font-mono text-[10px] text-ink-muted">
          {exposure != null ? `${formatCompactCurrency(exposure, currency)} exposure` : 'not costed'}
        </p>
      </td>
      <td className="py-3 pr-3">
        <input
          className="!py-1 text-xs"
          value={form.owner}
          placeholder="Owner"
          onChange={(e) => change('owner', e.target.value)}
        />
      </td>
      <td className="w-1/3 py-3 pr-3">
        <div className="flex flex-col gap-1.5">
          <input
            className="w-full !py-1 text-xs"
            value={form.action}
            placeholder="Remediation action"
            onChange={(e) => change('action', e.target.value)}
          />
          <select
            className="!py-1 text-xs"
            aria-label="Continuity strategy"
            value={form.strategy ?? ''}
            onChange={(e) =>
              change('strategy', e.target.value === '' ? null : (e.target.value as RecoveryStrategy))
            }
          >
            <option value="">Strategy not chosen</option>
            {RECOVERY_STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {STRATEGY_LABELS[s]}
              </option>
            ))}
          </select>
          {form.strategy && (
            <p className="text-[10px] leading-snug text-ink-muted">
              {STRATEGY_DESCRIPTIONS[form.strategy]}
            </p>
          )}
        </div>
      </td>
      <td className="py-3 pr-3">
        <div className="flex flex-col gap-1.5">
          <input
            className="!py-1 text-xs"
            type="number"
            min={0}
            aria-label="Estimated cost"
            value={form.estimatedCost ?? ''}
            placeholder="Cost"
            onChange={(e) =>
              change('estimatedCost', e.target.value === '' ? null : Math.max(0, Number(e.target.value)))
            }
          />
          <input
            className="!py-1 text-xs"
            type="date"
            aria-label="Target close date"
            value={form.targetDate ?? ''}
            onChange={(e) => change('targetDate', e.target.value)}
          />
          {worthIt !== null && (
            <p
              className={`text-[10px] leading-snug ${worthIt ? 'text-ok' : 'text-warn'}`}
              title={`Cost ${formatCurrency(cost!, currency)} vs exposure ${formatCurrency(exposure!, currency)}`}
            >
              {worthIt
                ? 'Costs less than a single occurrence of the gap.'
                : 'Costs more than one occurrence; justify on frequency or non-financial impact.'}
            </p>
          )}
        </div>
      </td>
      <td className="py-3 pr-3">
        <select
          className="!py-1 text-xs"
          value={form.status}
          onChange={(e) => change('status', e.target.value as GapStatus)}
        >
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="accepted">Risk accepted</option>
        </select>
      </td>
      <td className="py-3">
        <button
          className={btn.small}
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              await saveRemediation({
                processId: gap.processId,
                kind: gap.kind,
                ...form,
                targetDate: form.targetDate === '' ? null : form.targetDate,
              });
              setDirty(false);
              router.refresh();
            })
          }
        >
          {pending ? '…' : dirty || !initial ? 'Save' : 'Saved'}
        </button>
      </td>
    </tr>
  );
}

export function GapsClient({
  processes,
  objectives,
  remediations,
  currency,
}: {
  processes: ProcessRow[];
  objectives: RecoveryObjectives[];
  remediations: GapRemediation[];
  currency: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const objectiveFor = (id: string) => objectives.find((o) => o.processId === id) ?? null;
  const gaps = processes.flatMap((p) => {
    const o = objectiveFor(p.id);
    return o ? computeGaps(o, p.mtpd) : [];
  });

  const totalExposure = gaps.reduce((sum, g) => {
    const p = processes.find((x) => x.id === g.processId);
    return sum + (p?.exposure[g.kind] ?? 0);
  }, 0);
  const totalCost = gaps.reduce((sum, g) => {
    const r = remediations.find((x) => x.processId === g.processId && x.kind === g.kind);
    return sum + (r?.estimatedCost ?? 0);
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Recovery objectives"
        subtitle="RTO targets are validated against each process's MTPD"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {['Process', 'MTPD', 'RTO target', 'RTO achievable', 'WRT', 'RPO target', 'RPO achievable', 'MBCO', ''].map((h, i) => (
                  <th key={i} className="pb-2 pr-3 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => {
                const o = objectiveFor(p.id);
                const validation = validateRto(o?.rtoTargetHours ?? null, p.mtpd, o?.wrtHours ?? null);
                return (
                  <Fragment key={p.id}>
                    <tr className="border-b border-line/60">
                      <td className="py-3 pr-3">
                        <span className="font-medium">{p.name}</span>{' '}
                        <TierBadge tier={p.tier} />
                      </td>
                      <td className="whitespace-nowrap py-3 pr-3 font-mono text-xs text-ink-soft">
                        {p.mtpd ? MTPD_LABELS[p.mtpd] : '·'}
                      </td>
                      <td className="tnum py-3 pr-3 font-mono text-xs">
                        {o?.rtoTargetHours != null ? (
                          <span className={validation.status === 'violation' ? 'text-bad' : validation.status === 'warn' ? 'text-warn' : ''}>
                            {formatHours(o.rtoTargetHours)}
                          </span>
                        ) : '·'}
                      </td>
                      <td className="tnum py-3 pr-3 font-mono text-xs">
                        {o?.rtoAchievableHours != null ? formatHours(o.rtoAchievableHours) : '·'}
                      </td>
                      <td className="tnum py-3 pr-3 font-mono text-xs">
                        {o?.wrtHours != null ? formatHours(o.wrtHours) : '·'}
                      </td>
                      <td className="tnum py-3 pr-3 font-mono text-xs">
                        {o?.rpoTargetHours != null ? formatHours(o.rpoTargetHours) : '·'}
                      </td>
                      <td className="tnum py-3 pr-3 font-mono text-xs">
                        {o?.rpoAchievableHours != null ? formatHours(o.rpoAchievableHours) : '·'}
                      </td>
                      <td className="tnum py-3 pr-3 font-mono text-xs">
                        {o?.mbcoPercent != null ? `${o.mbcoPercent}%` : '·'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          className={btn.small}
                          onClick={() => setEditing(editing === p.id ? null : p.id)}
                        >
                          {editing === p.id ? 'Close' : o ? 'Edit' : 'Set'}
                        </button>
                      </td>
                    </tr>
                    {editing === p.id && (
                      <tr>
                        <td colSpan={9} className="pb-4">
                          <ObjectivesEditor
                            process={p}
                            initial={o}
                            onDone={() => setEditing(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Gap register"
        subtitle={
          totalExposure > 0
            ? `${formatCompactCurrency(totalExposure, currency)} of exposure on the register, ${formatCompactCurrency(totalCost, currency)} of remediation costed`
            : 'Every process whose achievable recovery falls short of its target'
        }
      >
        {gaps.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No gaps identified. Gaps appear automatically when an achievable RTO or RPO
            exceeds its target.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  {[
                    'Process',
                    'Target → achievable',
                    'Gap & exposure',
                    'Owner',
                    'Remediation & strategy',
                    'Cost & due date',
                    'Status',
                    '',
                  ].map((h, i) => (
                    <th key={i} className="pb-2 pr-3 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gaps.map((g) => (
                  <RemediationEditor
                    key={`${g.processId}-${g.kind}`}
                    gap={g}
                    processName={processes.find((p) => p.id === g.processId)?.name ?? g.processId}
                    initial={
                      remediations.find(
                        (r) => r.processId === g.processId && r.kind === g.kind
                      ) ?? null
                    }
                    exposure={
                      processes.find((p) => p.id === g.processId)?.exposure[g.kind] ?? null
                    }
                    currency={currency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
