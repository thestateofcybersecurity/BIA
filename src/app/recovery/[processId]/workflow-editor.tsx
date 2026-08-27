'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { saveWorkflow, draftWorkflowWithAi, type WorkflowDraft } from '@/lib/actions';
import type { RecoveryWorkflow, RecoveryStep, DependencyMap } from '@/lib/domain/types';
import { DEPENDENCY_CLASSES, DEPENDENCY_LABELS } from '@/lib/domain/constants';
import { Card, btn, StatusPill, useUnloadGuard } from '@/components/ui';
import { formatHours } from '@/lib/format';

const emptyDeps = (): DependencyMap => ({
  people: [], applications: [], equipment: [], facilities: [], suppliers: [], data: [],
});

const newStep = (): RecoveryStep => ({
  id: nanoid(8),
  description: '',
  team: '',
  durationHours: 1,
  dependencies: emptyDeps(),
  alternateStaff: [],
});

const parseList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

/**
 * Comma-separated list input that only parses on blur. Parsing every
 * keystroke mangled typing ("IT, Ops" became "IT" the moment the comma
 * landed) and jumped the caret; here the raw text is kept locally until
 * focus leaves, then committed as a clean list.
 */
function CommaListInput({
  values,
  onCommit,
  placeholder,
  className,
  ariaLabel,
}: {
  values: string[];
  onCommit: (next: string[]) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const joined = values.join(', ');
  const [raw, setRaw] = useState(joined);
  const [syncedAt, setSyncedAt] = useState(joined);
  if (joined !== syncedAt) {
    // The committed value changed underneath us (save reset the editor,
    // a draft loaded); resync once rather than on every keystroke.
    setSyncedAt(joined);
    setRaw(joined);
  }
  return (
    <input
      className={className}
      value={raw}
      placeholder={placeholder}
      aria-label={ariaLabel}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const next = parseList(raw);
        if (next.join(', ') !== joined) onCommit(next);
        else setSyncedAt(next.join(', '));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}

export function WorkflowEditor({
  processId,
  initial,
  rtoTargetHours,
  aiAvailable,
  aiBlockedReason,
}: {
  processId: string;
  initial: RecoveryWorkflow | null;
  rtoTargetHours: number | null;
  aiAvailable: boolean;
  /** Plan limit standing in the way, if any. Null means it can be used. */
  aiBlockedReason: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [steps, setSteps] = useState<RecoveryStep[]>(initial?.steps ?? []);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [drafting, startDraft] = useTransition();
  const [focus, setFocus] = useState('');
  const [draftNotes, setDraftNotes] = useState<WorkflowDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const runDraft = () => {
    // A draft replaces everything in the editor, and the editor is not saved
    // until Save is pressed — so hand-typed steps can vanish without a trace.
    const hasContent = steps.some((s) => s.description.trim() || s.team.trim());
    if (hasContent && !window.confirm('Replace the steps currently in the editor with a Claude draft? Unsaved edits are lost.')) {
      return;
    }
    startDraft(async () => {
      setDraftError(null);
      try {
        const draft = await draftWorkflowWithAi(processId, focus);
        setSteps(draft.steps);
        setDraftNotes(draft);
        setSaved(false);
        setTouched(true);
      } catch (e) {
        setDraftError(e instanceof Error ? e.message : 'Drafting failed.');
      }
    });
  };

  const update = (id: string, patch: Partial<RecoveryStep>) => {
    setSaved(false);
    setTouched(true);
    setSteps((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const move = (i: number, dir: -1 | 1) => {
    setSaved(false);
    setTouched(true);
    setSteps((ss) => {
      const next = [...ss];
      const j = i + dir;
      if (j < 0 || j >= next.length) return ss;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const total = steps.reduce((s, x) => s + (x.durationHours || 0), 0);
  const over = rtoTargetHours != null && total > rtoTargetHours;

  useUnloadGuard(touched && !pending);

  return (
    <div className="flex flex-col gap-4">
      {aiAvailable && aiBlockedReason && (
        <Card title="Draft with Claude">
          <p className="rounded bg-s0 px-3 py-2 text-xs leading-relaxed text-ink-muted">
            {aiBlockedReason}
          </p>
        </Card>
      )}
      {aiAvailable && !aiBlockedReason && (
        <Card
          title="Draft with Claude"
          subtitle="Builds a sequence from this process's objectives, dependencies, resource profile, gaps, and threats"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[240px] flex-1 flex-col gap-1">
              <label htmlFor="wf-focus">Anything specific to account for (optional)</label>
              <input
                id="wf-focus"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="Assume the primary site is unreachable, or plan around the untested payment cutover"
              />
            </div>
            <button
              type="button"
              className={btn.primary}
              disabled={drafting}
              onClick={runDraft}
            >
              {drafting ? 'Drafting…' : steps.length > 0 ? 'Replace with a draft' : 'Draft the workflow'}
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            The draft loads into the editor below for review and is not saved until you press save.
            Treat the durations as a starting point for the people who would actually run the
            steps: an estimate nobody has argued with is the one that fails in an exercise.
            {steps.length > 0 && ' Drafting replaces the steps currently in the editor.'}
          </p>
          {draftError && <p className="mt-2 text-sm text-bad">{draftError}</p>}
          {draftNotes && (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  Against the RTO
                </p>
                <div className="mt-1 flex items-start gap-2">
                  <StatusPill tone={draftNotes.fitsRto ? 'ok' : 'bad'}>
                    {draftNotes.fitsRto ? 'Fits' : 'Does not fit'}
                  </StatusPill>
                  <p className="text-sm text-ink-soft">{draftNotes.rtoCommentary}</p>
                </div>
              </div>
              {draftNotes.sequencingNotes && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Why this order
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {draftNotes.sequencingNotes}
                  </p>
                </div>
              )}
              {draftNotes.assumptions.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    Assumptions to confirm
                  </p>
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
                    {draftNotes.assumptions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="tnum font-mono text-sm text-ink-soft">
          {steps.length} steps · {formatHours(total)} sequential time
        </span>
        {rtoTargetHours != null &&
          (over ? (
            <StatusPill tone="bad">Exceeds RTO target {formatHours(rtoTargetHours)}</StatusPill>
          ) : (
            <StatusPill tone="ok">Within RTO target {formatHours(rtoTargetHours)}</StatusPill>
          ))}
        {rtoTargetHours == null && (
          <StatusPill tone="neutral">No RTO target set for comparison</StatusPill>
        )}
      </div>

      {steps.map((s, i) => (
        <Card key={s.id} className="relative">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="tnum inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-sm text-paper">
                {i + 1}
              </span>
              <button type="button" aria-label="Move up" className="text-xs text-ink-faint hover:text-accent disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
              <button type="button" aria-label="Move down" className="text-xs text-ink-faint hover:text-accent disabled:opacity-30" disabled={i === steps.length - 1} onClick={() => move(i, 1)}>▼</button>
            </div>
            <div className="min-w-0 flex-1">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_110px]">
                <div className="flex flex-col gap-1">
                  <label>Step description</label>
                  <input
                    value={s.description}
                    onChange={(e) => update(s.id, { description: e.target.value })}
                    placeholder="Confirm database failover to standby region"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label>Responsible team</label>
                  <input
                    value={s.team}
                    onChange={(e) => update(s.id, { team: e.target.value })}
                    placeholder="IT Infrastructure"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label>Duration (h)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    className="tnum"
                    value={s.durationHours}
                    onChange={(e) => update(s.id, { durationHours: Math.max(0, Number(e.target.value)) })}
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  className="text-xs text-accent hover:underline"
                  onClick={() => setOpen(open === s.id ? null : s.id)}
                >
                  {open === s.id ? 'Hide' : 'Show'} dependencies &amp; alternates
                </button>
                <button
                  type="button"
                  className="text-xs text-ink-faint hover:text-bad"
                  onClick={() => { setSaved(false); setTouched(true); setSteps((ss) => ss.filter((x) => x.id !== s.id)); }}
                >
                  Remove step
                </button>
              </div>

              {open === s.id && (
                <div className="mt-3 grid gap-3 rounded-md border border-line bg-paper/60 p-3 sm:grid-cols-2">
                  {DEPENDENCY_CLASSES.map((cls) => (
                    <div key={cls} className="flex flex-col gap-1">
                      <label>{DEPENDENCY_LABELS[cls]}</label>
                      <CommaListInput
                        className="text-xs"
                        values={s.dependencies[cls]}
                        placeholder="Comma separated"
                        onCommit={(next) =>
                          update(s.id, {
                            dependencies: { ...s.dependencies, [cls]: next },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label>Alternate staff</label>
                    <CommaListInput
                      className="text-xs"
                      values={s.alternateStaff}
                      placeholder="Who can execute this step if the primary team is unavailable"
                      onCommit={(next) => update(s.id, { alternateStaff: next })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={btn.secondary}
          onClick={() => { setSaved(false); setTouched(true); setSteps((ss) => [...ss, newStep()]); }}
        >
          + Add step
        </button>
        <button
          className={btn.primary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await saveWorkflow({ processId, steps });
              } catch (e) {
                setSaveError(e instanceof Error ? e.message : 'Save failed.');
                return;
              }
              setSaveError(null);
              setSaved(true);
              setTouched(false);
              router.refresh();
            })
          }
        >
          {pending ? 'Saving…' : 'Save workflow'}
        </button>
        {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
        {saveError && <span className="text-sm text-bad">{saveError}</span>}
      </div>
    </div>
  );
}
