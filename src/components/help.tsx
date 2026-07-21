/**
 * Collapsible methodology help, placed under the page header on every page.
 * Server-renderable; hidden in print output.
 */
export function HelpBox({
  title = 'How this page works',
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="no-print group mb-6 rounded-lg border border-accent/25 bg-accent-soft/30">
      <summary className="flex cursor-pointer select-none items-center gap-2.5 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-accent">
        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent text-[10px] leading-none">
          ?
        </span>
        {title}
        <span className="ml-auto text-ink-faint group-open:hidden">show</span>
        <span className="ml-auto hidden text-ink-faint group-open:inline">hide</span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-accent/15 px-4 py-3.5 text-sm leading-relaxed text-ink-soft [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-ink">
        {children}
      </div>
    </details>
  );
}
