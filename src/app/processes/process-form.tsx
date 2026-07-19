'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveProcess, deleteProcess } from '@/lib/actions';
import type { BusinessProcess, DependencyMap, DependencyClass } from '@/lib/domain/types';
import { DEPENDENCY_CLASSES, DEPENDENCY_LABELS } from '@/lib/domain/constants';
import { Card, btn } from '@/components/ui';

const emptyDeps = (): DependencyMap => ({
  people: [], applications: [], equipment: [], facilities: [], suppliers: [], data: [],
});

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const items = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length) onChange([...values, ...items.filter((i) => !values.includes(i))]);
    setDraft('');
  };
  return (
    <div className="rounded-md border border-line bg-surface p-2">
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs text-ink"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                className="text-ink-muted hover:text-bad"
                onClick={() => onChange(values.filter((x) => x !== v))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="w-full border-0 !p-1 text-sm shadow-none focus:!shadow-none"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}

export function ProcessForm({
  initial,
  allProcesses,
}: {
  initial: BusinessProcess | null;
  allProcesses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    owner: initial?.owner ?? '',
    department: initial?.department ?? '',
    usersServed: initial?.usersServed ?? '',
    peakPeriods: initial?.peakPeriods ?? '',
    dependencies: initial?.dependencies ?? emptyDeps(),
    upstreamProcessIds: initial?.upstreamProcessIds ?? [],
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setDep = (cls: DependencyClass, v: string[]) =>
    setForm((f) => ({ ...f, dependencies: { ...f.dependencies, [cls]: v } }));

  const others = allProcesses.filter((p) => p.id !== initial?.id);

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await saveProcess({ id: initial?.id, ...form });
          router.push('/processes');
          router.refresh();
        });
      }}
    >
      <Card title="Process details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="p-name">Process name</label>
            <input
              id="p-name"
              required
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Claims processing"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label htmlFor="p-desc">Description</label>
            <textarea
              id="p-desc"
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What this process does and why it matters"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-owner">Owner</label>
            <input
              id="p-owner"
              value={form.owner}
              onChange={(e) => set('owner', e.target.value)}
              placeholder="Name of the accountable person"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-dept">Department</label>
            <input
              id="p-dept"
              value={form.department}
              onChange={(e) => set('department', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-users">Who it serves</label>
            <input
              id="p-users"
              value={form.usersServed}
              onChange={(e) => set('usersServed', e.target.value)}
              placeholder="All policyholders (210,000)"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="p-peak">Peak periods</label>
            <input
              id="p-peak"
              value={form.peakPeriods}
              onChange={(e) => set('peakPeriods', e.target.value)}
              placeholder="Month end, renewal season"
            />
          </div>
        </div>
      </Card>

      <Card
        title="Dependencies"
        subtitle="What must exist for this process to run. Press Enter or comma to add each item."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {DEPENDENCY_CLASSES.map((cls) => (
            <div key={cls} className="flex flex-col gap-1">
              <label>{DEPENDENCY_LABELS[cls]}</label>
              <TagInput
                values={form.dependencies[cls]}
                onChange={(v) => setDep(cls, v)}
                placeholder="Add and press Enter"
              />
            </div>
          ))}
        </div>

        {others.length > 0 && (
          <div className="mt-5 flex flex-col gap-1">
            <label>Upstream processes (this process cannot run without them)</label>
            <div className="flex flex-wrap gap-2">
              {others.map((p) => {
                const on = form.upstreamProcessIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      set(
                        'upstreamProcessIds',
                        on
                          ? form.upstreamProcessIds.filter((x) => x !== p.id)
                          : [...form.upstreamProcessIds, p.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      on
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line bg-surface text-ink-soft hover:border-accent'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <button type="submit" className={btn.primary} disabled={pending}>
          {pending ? 'Saving…' : initial ? 'Save changes' : 'Create process'}
        </button>
        {initial && (
          <button
            type="button"
            className={btn.danger}
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete "${initial.name}" and all of its assessment data?`)) return;
              start(async () => {
                await deleteProcess(initial.id);
                router.push('/processes');
                router.refresh();
              });
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
