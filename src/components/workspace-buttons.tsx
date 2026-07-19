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
      onClick={() => start(async () => { await loadSampleData(); router.refresh(); })}
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
        start(async () => { await resetWorkspace(); router.refresh(); });
      }}
    >
      {pending ? 'Resetting…' : 'Reset workspace'}
    </button>
  );
}

export function ExportButton() {
  return (
    <button
      className={btn.secondary}
      onClick={async () => {
        const ws = await loadWorkspace();
        const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bia-workspace-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }}
    >
      Export JSON
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
              await importWorkspace(text);
              router.refresh();
            } catch {
              alert('That file is not a valid workspace export.');
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
