'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startLibraryExercise, startAiExercise } from '@/lib/actions';
import { Card, btn } from '@/components/ui';

export function ExerciseLauncher({
  scenarioId,
  aiEnabled,
}: {
  scenarioId: string;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'idle' | 'library' | 'ai'>('idle');
  const [focus, setFocus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const launch = (kind: 'library' | 'ai') => {
    setMode(kind);
    setError(null);
    start(async () => {
      try {
        const { id } =
          kind === 'library'
            ? await startLibraryExercise(scenarioId)
            : await startAiExercise(scenarioId, focus);
        router.push(`/exercises/session/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
        setMode('idle');
      }
    });
  };

  return (
    <Card
      title="Run this exercise"
      subtitle="A live session steps through the phases, records participant responses, and produces an after-action report"
      className="mb-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line bg-paper/60 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Template session
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Uses the scenario exactly as shown below, already populated with your
            processes, dependencies, and known gaps.
          </p>
          <button
            className={`${btn.secondary} mt-3`}
            disabled={pending}
            onClick={() => launch('library')}
          >
            {pending && mode === 'library' ? 'Starting…' : 'Start live session'}
          </button>
        </div>

        <div className="rounded-md border border-accent/40 bg-accent-soft/40 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
            Claude-tailored session
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Claude designs a bespoke exercise from your full assessment: it writes
            injects that collide with your documented recovery gaps and aims the
            discussion at your weakest maturity domains.
          </p>
          {aiEnabled ? (
            <>
              <textarea
                rows={2}
                className="mt-3 w-full text-sm"
                placeholder="Optional focus, e.g. 'assume it happens during renewal season with the CFO traveling'"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
              <button
                className={`${btn.primary} mt-2`}
                disabled={pending}
                onClick={() => launch('ai')}
              >
                {pending && mode === 'ai' ? 'Claude is designing the exercise…' : 'Generate with Claude'}
              </button>
              {pending && mode === 'ai' && (
                <p className="mt-2 text-xs text-ink-muted">
                  This reads your whole workspace and can take a minute or two.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 rounded bg-s0 px-3 py-2 text-xs text-ink-muted">
              Set ANTHROPIC_API_KEY in the environment to enable Claude-tailored
              exercises and after-action reports.
            </p>
          )}
        </div>
      </div>
      {error && <p className="mt-3 rounded bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>}
    </Card>
  );
}
