'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const STEPS = [
  { href: '/', num: '00', label: 'Dashboard' },
  { href: '/organization', num: '01', label: 'Organization' },
  { href: '/processes', num: '02', label: 'Processes' },
  { href: '/assessments', num: '03', label: 'Impact assessment' },
  { href: '/gaps', num: '04', label: 'Objectives & gaps' },
  { href: '/recovery', num: '05', label: 'Recovery workflows' },
  { href: '/requirements', num: '06', label: 'IT & supplier needs' },
  { href: '/maturity', num: '07', label: 'Maturity' },
  { href: '/exercises', num: '08', label: 'Tabletop exercises' },
  { href: '/report', num: '09', label: 'BC plan report' },
];

export function Nav({ account }: { account?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface/80 px-5 py-8 backdrop-blur md:flex">
      <Link href="/" className="mb-10 block">
        <span className="font-display text-3xl font-semibold tracking-tight">BIA</span>
        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
          Business Impact
          <br />
          Assessment
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {STEPS.map((s) => {
          const active =
            s.href === '/' ? pathname === '/' : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`group flex items-baseline gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? 'bg-ink text-paper'
                  : 'text-ink-soft hover:bg-accent-soft hover:text-ink'
              }`}
            >
              <span
                className={`font-mono text-[10px] ${
                  active ? 'text-accent-soft' : 'text-accent'
                }`}
              >
                {s.num}
              </span>
              {s.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
        {account}
        <p className="font-mono text-[10px] leading-relaxed text-ink-faint">
          ISO 22317 · ISO 22301
          <br />
          NIST SP 800-34
        </p>
      </div>
    </aside>
  );
}
