'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveNotificationPrefs } from '@/lib/actions';
import type { Workspace } from '@/lib/domain/types';
import { Card, btn } from '@/components/ui';

const OPTIONS = [
  ['signOffRequests', 'Sign-off requests', 'When an assessment becomes complete and needs owner approval'],
  ['aarReady', 'After-action reports', 'When Claude finishes an exercise report'],
  ['reviewReminders', 'Weekly review reminders', 'Mondays: assessments past the annual review cadence or awaiting sign-off'],
] as const;

export function NotificationSettings({
  initial,
  emailEnabled,
}: {
  initial: Workspace['notifications'];
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    signOffRequests: initial?.signOffRequests !== false,
    aarReady: initial?.aarReady !== false,
    reviewReminders: initial?.reviewReminders !== false,
  });

  return (
    <Card title="Email notifications" subtitle="Sent to your account email">
      {!emailEnabled && (
        <p className="mb-3 rounded bg-s0 px-3 py-2 text-xs text-ink-muted">
          Set RESEND_API_KEY in the environment to enable notification emails.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {OPTIONS.map(([key, label, help]) => (
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
              await saveNotificationPrefs(prefs);
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
        {saved && !pending && <span className="text-sm text-ok">Saved.</span>}
      </div>
    </Card>
  );
}
