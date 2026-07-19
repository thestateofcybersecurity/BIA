'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveOrg } from '@/lib/actions';
import type { OrgProfile, RiskAppetite } from '@/lib/domain/types';
import {
  FINANCIAL_BAND_FRACTIONS,
  APPETITE_MULTIPLIER,
  APPETITE_LABELS,
  SEVERITY_LABELS,
} from '@/lib/domain/constants';
import { Card, btn, SEVERITY_BG } from '@/components/ui';
import { formatCurrency } from '@/lib/format';
import type { Severity } from '@/lib/domain/types';

export function OrgForm({ initial }: { initial: OrgProfile | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    industry: initial?.industry ?? '',
    regulatoryContext: initial?.regulatoryContext ?? '',
    annualRevenue: initial?.annualRevenue ?? 0,
    employees: initial?.employees ?? 0,
    riskAppetite: (initial?.riskAppetite ?? 'moderate') as RiskAppetite,
    currency: initial?.currency ?? 'USD',
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const thresholds = FINANCIAL_BAND_FRACTIONS.map(
    (f) => f * form.annualRevenue * APPETITE_MULTIPLIER[form.riskAppetite]
  );

  const bandRows: { sev: Severity; range: string }[] =
    form.annualRevenue > 0
      ? [
          { sev: 0, range: `under ${formatCurrency(thresholds[0], form.currency)}` },
          { sev: 1, range: `${formatCurrency(thresholds[0], form.currency)} to ${formatCurrency(thresholds[1], form.currency)}` },
          { sev: 2, range: `${formatCurrency(thresholds[1], form.currency)} to ${formatCurrency(thresholds[2], form.currency)}` },
          { sev: 3, range: `${formatCurrency(thresholds[2], form.currency)} to ${formatCurrency(thresholds[3], form.currency)}` },
          { sev: 4, range: `${formatCurrency(thresholds[3], form.currency)} or more` },
        ]
      : [];

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            await saveOrg(form);
            setSaved(true);
            router.refresh();
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="org-name">Organization name</label>
            <input
              id="org-name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Acme Manufacturing"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="org-industry">Industry</label>
            <input
              id="org-industry"
              value={form.industry}
              onChange={(e) => set('industry', e.target.value)}
              placeholder="Discrete manufacturing"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="org-reg">Regulatory context</label>
            <input
              id="org-reg"
              value={form.regulatoryContext}
              onChange={(e) => set('regulatoryContext', e.target.value)}
              placeholder="SOC 2, state privacy laws"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="org-rev">Annual revenue</label>
            <input
              id="org-rev"
              type="number"
              min={1}
              required
              value={form.annualRevenue || ''}
              onChange={(e) => set('annualRevenue', Number(e.target.value))}
              placeholder="180000000"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="org-emp">Employees</label>
            <input
              id="org-emp"
              type="number"
              min={1}
              required
              value={form.employees || ''}
              onChange={(e) => set('employees', Number(e.target.value))}
              placeholder="450"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="org-appetite">Risk appetite</label>
            <select
              id="org-appetite"
              value={form.riskAppetite}
              onChange={(e) => set('riskAppetite', e.target.value as RiskAppetite)}
            >
              {(Object.keys(APPETITE_LABELS) as RiskAppetite[]).map((a) => (
                <option key={a} value={a}>
                  {APPETITE_LABELS[a]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="org-currency">Currency (ISO code)</label>
            <input
              id="org-currency"
              value={form.currency}
              maxLength={3}
              onChange={(e) => set('currency', e.target.value.toUpperCase())}
            />
          </div>
        </div>

        {bandRows.length > 0 && (
          <div className="rounded-md border border-line bg-paper/60 p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
              Financial severity bands · cumulative loss
            </p>
            <ul className="flex flex-col gap-1.5">
              {bandRows.map(({ sev, range }) => (
                <li key={sev} className="flex items-center gap-3 text-sm">
                  <span
                    className={`tnum inline-flex h-6 w-8 items-center justify-center rounded font-mono text-xs ${SEVERITY_BG[sev]}`}
                  >
                    {sev}
                  </span>
                  <span className="w-24 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    {SEVERITY_LABELS[sev]}
                  </span>
                  <span className="tnum text-ink-soft">{range}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className={btn.primary} disabled={pending}>
            {pending ? 'Saving…' : 'Save profile'}
          </button>
          {saved && !pending && (
            <span className="text-sm text-ok">Saved.</span>
          )}
        </div>
      </form>
    </Card>
  );
}
