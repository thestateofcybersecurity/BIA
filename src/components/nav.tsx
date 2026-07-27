'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Capability } from '@/lib/domain/authz';

/**
 * Each step names the capability needed to open it. Hiding a link is not
 * access control (the pages and actions enforce their own), but showing
 * someone a link that will refuse them is its own kind of rudeness.
 */
const STEPS: { href: string; num: string; label: string; needs: Capability }[] = [
  { href: '/', num: '00', label: 'Dashboard', needs: 'dashboard:view' },
  { href: '/organization', num: '01', label: 'Organization', needs: 'process:read' },
  { href: '/processes', num: '02', label: 'Processes', needs: 'process:read' },
  { href: '/assessments', num: '03', label: 'Impact assessment', needs: 'assessment:read' },
  { href: '/risks', num: '04', label: 'Risk register', needs: 'risk:read' },
  { href: '/gaps', num: '05', label: 'Objectives & gaps', needs: 'objectives:read' },
  { href: '/recovery', num: '06', label: 'Recovery workflows', needs: 'workflow:read' },
  { href: '/requirements', num: '07', label: 'Requirements', needs: 'requirements:read' },
  { href: '/activation', num: '08', label: 'Activation & comms', needs: 'plan:read' },
  { href: '/maturity', num: '09', label: 'Maturity', needs: 'maturity:read' },
  { href: '/exercises', num: '10', label: 'Tabletop exercises', needs: 'exercise:read' },
  { href: '/report', num: '11', label: 'BC plan report', needs: 'report:export' },
];

export function Nav({
  account,
  allowed,
  canViewTeam,
}: {
  account?: React.ReactNode;
  /** Capabilities the signed-in member holds. */
  allowed: Capability[];
  canViewTeam: boolean;
}) {
  const pathname = usePathname();
  const held = new Set(allowed);

  // Contribution pages are for invited process owners with no account: the
  // workspace navigation is not theirs to see, and every link would bounce
  // them to sign-in.
  if (pathname.startsWith('/contribute')) return null;

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
        {STEPS.filter((s) => held.has(s.needs)).map((s) => {
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
        {canViewTeam && (
          <Link
            href="/team"
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              pathname.startsWith('/team')
                ? 'bg-ink text-paper'
                : 'text-ink-soft hover:bg-accent-soft hover:text-ink'
            }`}
          >
            People &amp; access
          </Link>
        )}
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
