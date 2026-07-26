'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { requestAssessmentFromOwner, revokeAssessmentRequest } from '@/lib/actions';
import type { CollectionRequest } from '@/lib/domain/types';
import { btn, StatusPill } from '@/components/ui';

const FAILURES: Record<string, string> = {
  unconfigured:
    'Contribution links need CONTRIBUTION_SECRET (or NEON_AUTH_COOKIE_SECRET) in the environment.',
  no_email: 'Add an email address for this process owner first.',
  not_found: 'Process not found.',
};

export function RequestButton({
  processId,
  ownerEmail,
  request,
}: {
  processId: string;
  ownerEmail: string;
  request: CollectionRequest | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const send = () =>
    start(async () => {
      const result = await requestAssessmentFromOwner(processId);
      if (!result.ok) {
        setNote(FAILURES[result.reason] ?? 'Could not create the request.');
        setLink(null);
        return;
      }
      setLink(result.link);
      setNote(
        result.emailed
          ? `Sent to ${ownerEmail}.`
          : 'Email is not configured, so nothing was sent. Copy the link below and pass it on yourself.'
      );
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {request?.status === 'sent' && (
          <StatusPill tone="warn">Requested {request.emailed ? '' : '(not emailed)'}</StatusPill>
        )}
        {request?.status === 'submitted' && <StatusPill tone="ok">Owner submitted</StatusPill>}
        <button type="button" className={btn.small} disabled={pending} onClick={send}>
          {pending ? '…' : request ? 'Resend request' : 'Request from owner'}
        </button>
        {request?.status === 'sent' && (
          <button
            type="button"
            className={btn.small}
            disabled={pending}
            onClick={() =>
              start(async () => {
                await revokeAssessmentRequest(request.id);
                setLink(null);
                setNote('Link revoked.');
                router.refresh();
              })
            }
          >
            Revoke link
          </button>
        )}
      </div>
      {note && <p className="text-xs text-ink-muted">{note}</p>}
      {link && (
        <div className="flex items-center gap-2">
          <input readOnly value={link} className="min-w-0 flex-1 !py-1 font-mono text-[10px]" />
          <button
            type="button"
            className={btn.small}
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}
