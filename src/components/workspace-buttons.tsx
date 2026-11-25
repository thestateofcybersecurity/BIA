'use client';

import { useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { loadSampleData, resetWorkspace, importWorkspace, loadWorkspace } from '@/lib/actions';
import { btn } from '@/components/ui';

export function LoadSampleButton({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className={btn[variant]}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await loadSampleData();
            router.refresh();
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Could not load the sample data.');
          }
        })
      }
    >
      {pending ? 'Loading…' : 'Load sample data'}
    </button>
  );
}

export function ResetButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className={btn.danger}
      disabled={pending}
      onClick={() => {
        if (!confirm('Erase everything in this workspace? This cannot be undone.')) return;
        start(async () => {
          try {
            await resetWorkspace();
            router.refresh();
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Could not reset the workspace.');
          }
        });
      }}
    >
      {pending ? 'Resetting…' : 'Reset workspace'}
    </button>
  );
}

export function ExportButton() {
  const [pending, start] = useTransition();
  return (
    <button
      className={btn.secondary}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const ws = await loadWorkspace();
            const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bia-workspace-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Could not export the workspace.');
          }
        })
      }
    >
      {pending ? 'Exporting…' : 'Export JSON'}
    </button>
  );
}

export function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          start(async () => {
            const text = await file.text();
            try {
              const result = await importWorkspace(text);
              if (!result.ok) {
                alert(result.message);
                return;
              }
              router.refresh();
            } catch {
              alert('That file could not be imported.');
            }
          });
          e.target.value = '';
        }}
      />
      <button className={btn.secondary} disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? 'Importing…' : 'Import JSON'}
      </button>
    </>
  );
}
