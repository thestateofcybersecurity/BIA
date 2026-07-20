'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import {
  saveExerciseProgress,
  completeExercise,
  generateExerciseReport,
  deleteExercise,
} from '@/lib/actions';
import type { ExerciseSession, ExerciseNote } from '@/lib/domain/types';
import { Card, btn } from '@/components/ui';

export function SessionRunner({
  session,
  aiEnabled,
}: {
  session: ExerciseSession;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState(
    Math.min(session.currentPhase, session.scenario.phases.length - 1)
  );
  const [responses, setResponses] = useState<Record<string, string>>(session.responses);
  const [notes, setNotes] = useState<ExerciseNote[]>(session.notes);
  const [noteDraft, setNoteDraft] = useState('');
  const [busy, setBusy] = useState<'save' | 'complete' | 'report' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const phases = session.scenario.phases;
  const current = phases[phase];
  const completed = session.status === 'completed';

  const persist = (nextPhase: number, onDone?: () => void) => {
    start(async () => {
      try {
        await saveExerciseProgress({
          sessionId: session.id,
          currentPhase: nextPhase,
          responses,
          notes,
        });
        onDone?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed.');
      } finally {
        setBusy(null);
      }
    });
  };

  const answeredCount = current.discussion.filter(
    (_, qi) => (responses[`${phase}:${qi}`] ?? '').trim() !== ''
  ).length;
  const allAnswered = answeredCount === current.discussion.length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        {/* Phase stepper */}
        <div className="flex flex-wrap items-center gap-1.5">
          {phases.map((p, i) => {
            const answered = p.discussion.every(
              (_, qi) => (session.responses[`${i}:${qi}`] ?? responses[`${i}:${qi}`] ?? '').trim() !== ''
            );
            return (
              <button
                key={i}
                onClick={() => { setPhase(i); persist(i); }}
                className={`rounded-full border px-3 py-1 font-mono text-[11px] transition-colors ${
                  i === phase
                    ? 'border-ink bg-ink text-paper'
                    : answered
                      ? 'border-ok/40 bg-ok/10 text-ok'
                      : 'border-line bg-surface text-ink-soft hover:border-accent'
                }`}
                title={p.title}
              >
                {i + 1}
              </button>
            );
          })}
          <span className="ml-2 font-mono text-[11px] text-ink-muted">
            Phase {phase + 1} of {phases.length}
          </span>
        </div>

        <Card>
          <h2 className="font-display text-xl font-semibold">{current.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{current.narrative}</p>

          {current.injects.length > 0 && (
            <div className="mt-4 rounded-md border border-accent/30 bg-accent-soft/50 p-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
                Facilitator injects
              </p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
                {current.injects.map((inj, i) => (
                  <li key={i}>{inj}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card
          title="Discussion"
          subtitle="Record the room's answer to each question before advancing"
        >
          <div className="flex flex-col gap-4">
            {current.discussion.map((q, qi) => {
              const key = `${phase}:${qi}`;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <p className="text-sm font-medium">{q}</p>
                  <textarea
                    rows={2}
                    className="text-sm"
                    value={responses[key] ?? ''}
                    disabled={completed}
                    placeholder="What did the team decide?"
                    onChange={(e) =>
                      setResponses((r) => ({ ...r, [key]: e.target.value }))
                    }
                  />
                </div>
              );
            })}
          </div>

          <details className="mt-4 rounded-md border border-line bg-paper/60 p-3">
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wider text-ink-muted">
              Facilitator guidance: what a good response includes
            </summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-ink-soft">
              {current.expectedActions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </details>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className={btn.secondary}
            disabled={pending || phase === 0}
            onClick={() => { const p = phase - 1; setPhase(p); persist(p); }}
          >
            ← Previous phase
          </button>
          {phase < phases.length - 1 ? (
            <button
              className={btn.primary}
              disabled={pending}
              onClick={() => { const p = phase + 1; setPhase(p); persist(p); }}
            >
              Next phase →
            </button>
          ) : (
            !completed && (
              <button
                className={btn.primary}
                disabled={pending}
                onClick={() => {
                  setBusy('complete');
                  start(async () => {
                    try {
                      await saveExerciseProgress({
                        sessionId: session.id,
                        currentPhase: phase,
                        responses,
                        notes,
                      });
                      await completeExercise(session.id);
                      router.refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Could not complete.');
                    } finally {
                      setBusy(null);
                    }
                  });
                }}
              >
                {busy === 'complete' ? 'Completing…' : 'Complete exercise'}
              </button>
            )
          )}
          {!allAnswered && !completed && (
            <span className="text-xs text-warn">
              {answeredCount}/{current.discussion.length} questions answered in this phase
            </span>
          )}
          <button
            className={btn.small}
            disabled={pending}
            onClick={() => { setBusy('save'); persist(phase); }}
          >
            {busy === 'save' && pending ? 'Saving…' : 'Save progress'}
          </button>
        </div>

        {completed && (
          <Card
            title="After-action report"
            subtitle="Claude reviews the recorded responses and notes against your BIA data"
          >
            {aiEnabled ? (
              <>
                <button
                  className={btn.primary}
                  disabled={pending}
                  onClick={() => {
                    setBusy('report');
                    setError(null);
                    start(async () => {
                      try {
                        await generateExerciseReport(session.id);
                        router.refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'Report generation failed.');
                      } finally {
                        setBusy(null);
                      }
                    });
                  }}
                >
                  {busy === 'report' ? 'Claude is writing the report…' : 'Generate after-action report'}
                </button>
                {busy === 'report' && (
                  <p className="mt-2 text-xs text-ink-muted">
                    This evaluates every response against your assessment data and can
                    take a minute or two.
                  </p>
                )}
              </>
            ) : (
              <p className="rounded bg-s0 px-3 py-2 text-xs text-ink-muted">
                Set ANTHROPIC_API_KEY to enable AI after-action reports.
              </p>
            )}
          </Card>
        )}

        {error && <p className="rounded bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>}
      </div>

      {/* Notes panel */}
      <div className="flex flex-col gap-4">
        <Card title="Facilitator notes" subtitle="Observations feed the after-action report">
          {!completed && (
            <div className="flex flex-col gap-2">
              <textarea
                rows={2}
                className="text-sm"
                placeholder="What are you observing?"
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <button
                className={btn.secondary}
                disabled={!noteDraft.trim()}
                onClick={() => {
                  const note: ExerciseNote = {
                    id: nanoid(8),
                    text: noteDraft.trim(),
                    phase,
                    at: new Date().toISOString(),
                  };
                  setNotes((n) => [...n, note]);
                  setNoteDraft('');
                }}
              >
                Add note
              </button>
            </div>
          )}
          <ul className="mt-3 flex flex-col gap-2">
            {notes.length === 0 && (
              <li className="text-xs text-ink-muted">No notes yet.</li>
            )}
            {[...notes].reverse().map((n) => (
              <li key={n.id} className="rounded-md border border-line bg-paper/60 p-2.5">
                <p className="text-sm text-ink-soft">{n.text}</p>
                <p className="mt-1 font-mono text-[10px] uppercase text-ink-faint">
                  {n.phase != null ? `Phase ${n.phase + 1}` : 'General'}
                  {!completed && (
                    <button
                      className="ml-2 text-ink-faint hover:text-bad"
                      onClick={() => setNotes((all) => all.filter((x) => x.id !== n.id))}
                    >
                      remove
                    </button>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <button
          className={btn.danger}
          disabled={pending}
          onClick={() => {
            if (!confirm('Delete this session and its recorded responses?')) return;
            start(async () => {
              await deleteExercise(session.id);
              router.push('/exercises');
              router.refresh();
            });
          }}
        >
          Delete session
        </button>
      </div>
    </div>
  );
}
