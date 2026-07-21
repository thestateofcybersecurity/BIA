'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveResourceProfile } from '@/lib/actions';
import type { RecoveryResourceProfile, Horizon } from '@/lib/domain/types';
import { HORIZONS, HORIZON_LABELS } from '@/lib/domain/constants';
import { Card, btn } from '@/components/ui';

const emptyHorizons = (): Record<Horizon, number | null> => ({
  h4: null, h24: null, d3: null, w1: null, m1: null,
});

const ROWS = [
  ['staff', 'Minimum staff'],
  ['workstations', 'Workstations / equipment'],
  ['facilitySeats', 'Facility seats'],
] as const;

export function ResourceProfileEditor({
  processId,
  initial,
}: {
  processId: string;
  initial: RecoveryResourceProfile | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [grid, setGrid] = useState({
    staff: initial?.staff ?? emptyHorizons(),
    workstations: initial?.workstations ?? emptyHorizons(),
    facilitySeats: initial?.facilitySeats ?? emptyHorizons(),
  });
  const [vitalRecords, setVitalRecords] = useState(
    (initial?.vitalRecords ?? []).join(', ')
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const set = (row: (typeof ROWS)[number][0], h: Horizon, raw: string) => {
    setSaved(false);
    const v = raw === '' ? null : Math.max(0, Math.round(Number(raw)));
    setGrid((g) => ({ ...g, [row]: { ...g[row], [h]: v } }));
  };

  return (
    <Card
      title="Recovery resource profile"
      subtitle="Minimum resources this process needs at each point after a disruption; this is what alternate-site and surge planning must actually provide"
      className="mb-4"
    >
      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="pr-2 text-left font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                Needed by
              </th>
              {HORIZONS.map((h) => (
                <th key={h} className="px-1 text-center font-mono text-[10px] font-normal uppercase tracking-wider text-ink-muted">
                  {HORIZON_LABELS[h]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([key, label]) => (
              <tr key={key}>
                <td className="whitespace-nowrap pr-2 text-sm text-ink-soft">{label}</td>
                {HORIZONS.map((h) => (
                  <td key={h} className="px-1">
                    <input
                      type="number"
                      min={0}
                      aria-label={`${label} at ${HORIZON_LABELS[h]}`}
                      className="tnum !w-20 text-center text-sm"
                      value={grid[key][h] ?? ''}
                      placeholder="·"
                      onChange={(e) => set(key, h, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label>Vital records &amp; data sets (comma separated)</label>
          <input
            className="text-sm"
            value={vitalRecords}
            placeholder="Claims files, policy master records"
            onChange={(e) => { setVitalRecords(e.target.value); setSaved(false); }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label>Notes</label>
          <input
            className="text-sm"
            value={notes}
            placeholder="Assumptions, surge arrangements, alternate site details"
            onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          className={btn.secondary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              await saveResourceProfile({
                processId,
                ...grid,
                vitalRecords: vitalRecords.split(',').map((s) => s.trim()).filter(Boolean),
                notes,
              });
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? 'Saving…' : 'Save resource profile'}
        </button>
        {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
      </div>
    </Card>
  );
}
