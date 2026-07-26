'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Tier } from '@/lib/domain/types';
import { TIER_LABELS } from '@/lib/domain/constants';
import { Card, TierBadge, StatusPill, btn } from '@/components/ui';

export interface ProcessRow {
  id: string;
  name: string;
  description: string;
  owner: string;
  department: string;
  dependencyCount: number;
  tier: Tier | null;
  priority: number | null;
  assessment: 'complete' | 'in_progress' | 'not_started';
}

type SortKey = 'priority' | 'name' | 'tier' | 'department';

const ASSESSMENT_LABELS: Record<ProcessRow['assessment'], string> = {
  complete: 'Complete',
  in_progress: 'In progress',
  not_started: 'Not started',
};

/**
 * Client-side filtering: the whole inventory is already in the payload, and
 * an inventory large enough to need server-side paging would be past the
 * point where a BIA workshop is the right tool anyway.
 */
export function ProcessTable({ rows }: { rows: ProcessRow[] }) {
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<'all' | Tier>('all');
  const [department, setDepartment] = useState('all');
  const [assessment, setAssessment] = useState<'all' | ProcessRow['assessment']>('all');
  const [sort, setSort] = useState<SortKey>('priority');

  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (tier !== 'all' && r.tier !== tier) return false;
      if (department !== 'all' && r.department !== department) return false;
      if (assessment !== 'all' && r.assessment !== assessment) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    });
    return out.sort((a, b) => {
      switch (sort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'tier':
          return (a.tier ?? 9) - (b.tier ?? 9) || (b.priority ?? -1) - (a.priority ?? -1);
        case 'department':
          return a.department.localeCompare(b.department) || a.name.localeCompare(b.name);
        default:
          return (b.priority ?? -1) - (a.priority ?? -1) || a.name.localeCompare(b.name);
      }
    });
  }, [rows, query, tier, department, assessment, sort]);

  const filtersActive =
    query.trim() !== '' || tier !== 'all' || department !== 'all' || assessment !== 'all';

  const clear = () => {
    setQuery('');
    setTier('all');
    setDepartment('all');
    setAssessment('all');
  };

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label htmlFor="proc-search">Search</label>
          <input
            id="proc-search"
            type="search"
            className="!py-1.5 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, owner, department, description"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="proc-tier">Tier</label>
          <select
            id="proc-tier"
            className="!py-1.5 text-sm"
            value={tier}
            onChange={(e) => setTier(e.target.value === 'all' ? 'all' : (Number(e.target.value) as Tier))}
          >
            <option value="all">All tiers</option>
            {([1, 2, 3, 4] as Tier[]).map((t) => (
              <option key={t} value={t}>
                {TIER_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        {departments.length > 1 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="proc-dept">Department</label>
            <select
              id="proc-dept"
              className="!py-1.5 text-sm"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="proc-assessment">Assessment</label>
          <select
            id="proc-assessment"
            className="!py-1.5 text-sm"
            value={assessment}
            onChange={(e) => setAssessment(e.target.value as typeof assessment)}
          >
            <option value="all">Any status</option>
            <option value="complete">Complete</option>
            <option value="in_progress">In progress</option>
            <option value="not_started">Not started</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="proc-sort">Sort</label>
          <select
            id="proc-sort"
            className="!py-1.5 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="priority">Priority score</option>
            <option value="tier">Tier</option>
            <option value="name">Name</option>
            <option value="department">Department</option>
          </select>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
          {filtered.length === rows.length
            ? `${rows.length} process${rows.length === 1 ? '' : 'es'}`
            : `${filtered.length} of ${rows.length} shown`}
        </p>
        {filtersActive && (
          <button type="button" className={btn.small} onClick={clear}>
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              {['Process', 'Owner', 'Department', 'Dependencies', 'Assessment', 'Tier'].map((h) => (
                <th
                  key={h}
                  className="pb-2 pr-4 font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-ink-muted">
                  No process matches these filters.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-4">
                    <Link href={`/processes/${p.id}`} className="font-medium hover:text-accent">
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="mt-0.5 max-w-sm truncate text-xs text-ink-muted">
                        {p.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-ink-soft">{p.owner || '·'}</td>
                  <td className="py-3 pr-4 text-ink-soft">{p.department || '·'}</td>
                  <td className="tnum py-3 pr-4 text-ink-soft">{p.dependencyCount}</td>
                  <td className="py-3 pr-4">
                    {p.assessment === 'complete' ? (
                      <StatusPill tone="ok">Complete</StatusPill>
                    ) : (
                      <Link href={`/assessments/${p.id}`}>
                        <StatusPill tone="warn">{ASSESSMENT_LABELS[p.assessment]}</StatusPill>
                      </Link>
                    )}
                  </td>
                  <td className="py-3">
                    <TierBadge tier={p.tier} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
