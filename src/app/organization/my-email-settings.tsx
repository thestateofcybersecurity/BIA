'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveMyNotificationPrefs } from '@/lib/actions';
import type { NotificationKind } from '@/lib/domain/types';
import { Card, btn } from '@/components/ui';
import { NOTIFICATION_OPTIONS } from './notification-settings';

/**
 * Personal email mutes, layered over the organization defaults any admin
 * sets. Everything defaults to on; unchecking writes a per-user opt-out
 * that notifyWorkspaceUser honors before a single send is attempted.
 */
export function MyEmailSettings({
  initial,
  emailEnabled,
}: {
  initial: Record<NotificationKind, boolean>;
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState(initial);

  return (
    <Card
      title="Your email preferences"
      subtitle="Choose what this workspace may send to your account email"
    >
      {!emailEnabled && (
        <p className="mb-3 rounded bg-s0 px-3 py-2 text-xs text-ink-muted">
          Set RESEND_API_KEY in the environment to enable notification emails.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {NOTIFICATION_OPTIONS.map(([key, label, help]) => (
          <label key={key} className="flex cursor-pointer items-start gap-3 normal-case tracking-normal">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[#bc4a1b]"
              checked={prefs[key]}
              onChange={(e) => {
                setSaved(false);
                setPrefs((p) => ({ ...p, [key]: e.target.checked }));
              }}
            />
            <span>
              <span className="block text-sm font-medium normal-case tracking-normal text-ink">{label}</span>
              <span className="block text-xs normal-case tracking-normal text-ink-muted">{help}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          className={btn.secondary}
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await saveMyNotificationPrefs(prefs);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not save your preferences.');
                return;
              }
              setError(null);
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? 'Saving…' : 'Save my preferences'}
        </button>
        {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>
    </Card>
  );
}
