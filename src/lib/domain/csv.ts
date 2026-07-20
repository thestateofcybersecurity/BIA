import type {
  DependencyMap,
  Horizon,
  RatedCategory,
  Severity,
} from './types';
import { HORIZONS, RATED_CATEGORIES, DEPENDENCY_CLASSES } from './constants';

/**
 * CSV bulk import. One row per business process; dependency and severity
 * columns are optional. List cells (dependencies, upstream) use semicolons.
 * The same parser runs client-side for preview and server-side for import.
 */

export const HORIZON_SUFFIX: Record<Horizon, string> = {
  h4: '4h',
  h24: '24h',
  d3: '3d',
  w1: '1w',
  m1: '1m',
};

const DEP_COLUMNS: Record<(typeof DEPENDENCY_CLASSES)[number], string> = {
  people: 'dep_people',
  applications: 'dep_applications',
  equipment: 'dep_equipment',
  facilities: 'dep_facilities',
  suppliers: 'dep_suppliers',
  data: 'dep_data',
};

export const CSV_COLUMNS: { name: string; required: boolean; description: string }[] = [
  { name: 'name', required: true, description: 'Process name (unique; re-imports update by name)' },
  { name: 'description', required: false, description: 'What the process does' },
  { name: 'owner', required: false, description: 'Accountable person' },
  { name: 'department', required: false, description: 'Owning department' },
  { name: 'users_served', required: false, description: 'Who it serves' },
  { name: 'peak_periods', required: false, description: 'When disruption hurts most' },
  ...DEPENDENCY_CLASSES.map((c) => ({
    name: DEP_COLUMNS[c],
    required: false,
    description: 'Semicolon-separated list',
  })),
  { name: 'upstream', required: false, description: 'Semicolon-separated names of processes this one depends on' },
  ...HORIZONS.map((h) => ({
    name: `loss_${HORIZON_SUFFIX[h]}`,
    required: false,
    description: 'Cumulative financial loss at this horizon (number, no currency symbol)',
  })),
  ...RATED_CATEGORIES.flatMap((cat) =>
    HORIZONS.map((h) => ({
      name: `${cat}_${HORIZON_SUFFIX[h]}`,
      required: false,
      description: 'Severity 0-4',
    }))
  ),
];

export interface ParsedRow {
  name: string;
  description: string;
  owner: string;
  department: string;
  usersServed: string;
  peakPeriods: string;
  dependencies: DependencyMap;
  upstreamNames: string[];
  losses: Record<Horizon, number | null>;
  ratings: Record<RatedCategory, Record<Horizon, Severity | null>>;
  hasAssessment: boolean;
  errors: string[];
  warnings: string[];
}

const splitList = (v: string | undefined): string[] =>
  (v ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

const emptyHorizons = <T,>(v: T): Record<Horizon, T> => ({
  h4: v, h24: v, d3: v, w1: v, m1: v,
});

/** Values never decrease over time; auto-fix with a running maximum. */
function monotonic<T extends number>(
  values: Record<Horizon, T | null>,
  label: string,
  warnings: string[]
): Record<Horizon, T | null> {
  let max: T | null = null;
  let fixed = false;
  const out = { ...values };
  for (const h of HORIZONS) {
    const v = out[h];
    if (v == null) continue;
    if (max != null && v < max) {
      out[h] = max;
      fixed = true;
    } else {
      max = v;
    }
  }
  if (fixed) warnings.push(`${label}: values decreased over time; raised to the running maximum`);
  return out;
}

export function parseCsvRecord(record: Record<string, string>, rowNum: number): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const get = (col: string) => (record[col] ?? '').trim();

  const name = get('name');
  if (!name) errors.push(`Row ${rowNum}: "name" is required`);

  const dependencies = Object.fromEntries(
    DEPENDENCY_CLASSES.map((c) => [c, splitList(get(DEP_COLUMNS[c]))])
  ) as unknown as DependencyMap;

  let losses = emptyHorizons<number | null>(null);
  let anyAssessment = false;
  for (const h of HORIZONS) {
    const raw = get(`loss_${HORIZON_SUFFIX[h]}`);
    if (raw === '') continue;
    const n = Number(raw.replace(/[$,\s]/g, ''));
    if (!Number.isFinite(n) || n < 0) {
      errors.push(`Row ${rowNum}: loss_${HORIZON_SUFFIX[h]} is not a valid amount ("${raw}")`);
    } else {
      losses[h] = n;
      anyAssessment = true;
    }
  }
  losses = monotonic(losses, `Row ${rowNum} losses`, warnings);

  const ratings = Object.fromEntries(
    RATED_CATEGORIES.map((cat) => {
      let values = emptyHorizons<Severity | null>(null);
      for (const h of HORIZONS) {
        const raw = get(`${cat}_${HORIZON_SUFFIX[h]}`);
        if (raw === '') continue;
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 0 || n > 4) {
          errors.push(`Row ${rowNum}: ${cat}_${HORIZON_SUFFIX[h]} must be 0-4 ("${raw}")`);
        } else {
          values[h] = n as Severity;
          anyAssessment = true;
        }
      }
      values = monotonic(values, `Row ${rowNum} ${cat}`, warnings);
      return [cat, values];
    })
  ) as ParsedRow['ratings'];

  return {
    name,
    description: get('description'),
    owner: get('owner'),
    department: get('department'),
    usersServed: get('users_served'),
    peakPeriods: get('peak_periods'),
    dependencies,
    upstreamNames: splitList(get('upstream')),
    losses,
    ratings,
    hasAssessment: anyAssessment,
    errors,
    warnings,
  };
}

export function csvTemplate(): string {
  const header = CSV_COLUMNS.map((c) => c.name).join(',');
  const example = [
    'Order fulfillment',
    'Pick pack and ship customer orders',
    'Jane Smith',
    'Operations',
    'All customers',
    'Holiday season',
    'Warehouse team (12 FTE);Shift supervisor',
    'WMS;ERP',
    'Forklifts;Barcode scanners',
    'Main warehouse',
    'Freight carrier;Packaging supplier',
    'Order records',
    'Order intake',
    '2000', '25000', '120000', '400000', '1500000',
    '1', '2', '3', '4', '4',
    '0', '1', '2', '3', '4',
    '0', '0', '1', '2', '2',
    '0', '0', '0', '0', '0',
  ];
  return `${header}\n${example.map((v) => (v.includes(',') || v.includes(';') ? `"${v}"` : v)).join(',')}\n`;
}
