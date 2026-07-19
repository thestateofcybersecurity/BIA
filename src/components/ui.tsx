import type { Severity, Tier } from '@/lib/domain/types';
import { SEVERITY_LABELS, TIER_LABELS, TIER_SHORT } from '@/lib/domain/constants';

export function PageHeader({
  kicker,
  title,
  intro,
  actions,
}: {
  kicker: string;
  title: string;
  intro?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div className="max-w-2xl">
        <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          {kicker}
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">{title}</h1>
        {intro && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{intro}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  subtitle,
  children,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-5 shadow-card ${className}`}>
      {title && (
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

const TIER_STYLES: Record<Tier, string> = {
  1: 'bg-s4 text-paper',
  2: 'bg-s3 text-paper',
  3: 'bg-s2 text-ink',
  4: 'bg-s0 text-ink-soft',
};

export function TierBadge({ tier, long = false }: { tier: Tier | null; long?: boolean }) {
  if (tier == null) {
    return (
      <span className="inline-block rounded-full border border-dashed border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
        Unassessed
      </span>
    );
  }
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TIER_STYLES[tier]}`}
    >
      {long ? TIER_LABELS[tier] : `T${tier} ${TIER_SHORT[tier]}`}
    </span>
  );
}

export const SEVERITY_BG: Record<Severity, string> = {
  0: 'bg-s0 text-ink-soft',
  1: 'bg-s1 text-ink',
  2: 'bg-s2 text-ink',
  3: 'bg-s3 text-paper',
  4: 'bg-s4 text-paper',
};

export function SeverityCell({
  value,
  title,
}: {
  value: Severity | null;
  title?: string;
}) {
  if (value == null) {
    return (
      <span
        title={title}
        className="tnum inline-flex h-7 w-9 items-center justify-center rounded border border-dashed border-line font-mono text-xs text-ink-faint"
      >
        ·
      </span>
    );
  }
  return (
    <span
      title={title ?? SEVERITY_LABELS[value]}
      className={`tnum inline-flex h-7 w-9 items-center justify-center rounded font-mono text-xs ${SEVERITY_BG[value]}`}
    >
      {value}
    </span>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: 'ok' | 'warn' | 'bad' | 'neutral';
  children: React.ReactNode;
}) {
  const styles = {
    ok: 'bg-ok/10 text-ok border-ok/30',
    warn: 'bg-warn/10 text-warn border-warn/30',
    bad: 'bg-bad/10 text-bad border-bad/30',
    neutral: 'bg-s0 text-ink-soft border-line',
  }[tone];
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${styles}`}
    >
      {children}
    </span>
  );
}

export function StatTile({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'accent' | 'bad';
}) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-card">
      <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">{label}</p>
      <p
        className={`tnum mt-2 font-display text-3xl font-semibold ${
          tone === 'bad' ? 'text-bad' : tone === 'accent' ? 'text-accent' : ''
        }`}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-ink-muted">{detail}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface/60 px-8 py-14 text-center">
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{body}</p>
      {children && <div className="mt-5 flex justify-center gap-3">{children}</div>}
    </div>
  );
}

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-accent disabled:opacity-40',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-40',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-md border border-bad/40 bg-surface px-4 py-2 text-sm font-medium text-bad transition-colors hover:bg-bad hover:text-paper disabled:opacity-40',
  small:
    'inline-flex items-center justify-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent',
};
