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
} from '@/lib/domain/types';
import { MTPD_LABELS } from '@/lib/domain/constants';
import { validateRto, computeGaps, type GapInfo } from '@/lib/domain/scoring';
import { Card, btn, StatusPill, TierBadge } from '@/components/ui';
import { formatHours } from '@/lib/format';

interface ProcessRow {
  id: string;
  name: string;
  mtpd: MtpdValue | null;
  tier: Tier | null;
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
    dataLossNotes: initial?.dataLossNotes ?? '',
  });

  const validation = validateRto(form.rtoTargetHours, process.mtpd);
  const tone =
    validation.status === 'ok' ? 'ok' : validation.status === 'warn' ? 'warn' : validation.status === 'violation' ? 'bad' : 'neutral';

  const fields: [string, keyof typeof form, string][] = [
    ['RTO target (h)', 'rtoTargetHours', 'How fast the business needs it back'],
    ['RTO achievable (h)', 'rtoAchievableHours', 'What current capability delivers'],
    ['RPO target (h)', 'rpoTargetHours', 'Tolerable data loss window'],
    ['RPO achievable (h)', 'rpoAchievableHours', 'Current backup/replication reality'],
    ['MBCO (%)', 'mbcoPercent', 'Minimum service level during recovery'],
  ];

  return (
    <div className="rounded-md border border-line bg-paper/60 p-4">
      <div className="grid gap-3 sm:grid-cols-5">
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
}: {
  gap: GapInfo;
  processName: string;
  initial: GapRemediation | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    owner: initial?.owner ?? '',
    action: initial?.action ?? '',
    status: (initial?.status ?? 'open') as GapStatus,
  });
  const [dirty, setDirty] = useState(false);

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
      </td>
      <td className="py-3 pr-3">
        <input
          className="!py-1 text-xs"
          value={form.owner}
          placeholder="Owner"
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, owner: e.target.value })); }}
        />
      </td>
      <td className="w-2/5 py-3 pr-3">
        <input
          className="w-full !py-1 text-xs"
          value={form.action}
          placeholder="Remediation action"
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, action: e.target.value })); }}
        />
      </td>
      <td className="py-3 pr-3">
        <select
          className="!py-1 text-xs"
          value={form.status}
          onChange={(e) => { setDirty(true); setForm((f) => ({ ...f, status: e.target.value as GapStatus })); }}
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
              await saveRemediation({ processId: gap.processId, kind: gap.kind, ...form });
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
}: {
  processes: ProcessRow[];
  objectives: RecoveryObjectives[];
  remediations: GapRemediation[];
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const objectiveFor = (id: string) => objectives.find((o) => o.processId === id) ?? null;
  const gaps = processes.flatMap((p) => {
    const o = objectiveFor(p.id);
    return o ? computeGaps(o, p.mtpd) : [];
  });

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
                {['Process', 'MTPD', 'RTO target', 'RTO achievable', 'RPO target', 'RPO achievable', 'MBCO', ''].map((h, i) => (
                  <th key={i} className="pb-2 pr-3 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processes.map((p) => {
                const o = objectiveFor(p.id);
                const validation = validateRto(o?.rtoTargetHours ?? null, p.mtpd);
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
                        <td colSpan={8} className="pb-4">
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
        subtitle="Every process whose achievable recovery falls short of its target"
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
                  {['Process', 'Target → achievable', 'Gap', 'Owner', 'Remediation', 'Status', ''].map((h, i) => (
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
