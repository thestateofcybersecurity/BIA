'use client';

import { useEffect } from 'react';
import { Card, btn } from '@/components/ui';

/**
 * Route-segment error boundary. Server actions can reject for reasons the
 * caller anticipates (ConcurrentEditError after another member saved first,
 * validation, missing records); without this boundary those rejections
 * crashed the whole segment and discarded whatever the user had typed.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <Card title="Something went wrong">
        <p className="text-sm leading-relaxed text-ink-soft">{error.message}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-ink-faint">ref: {error.digest}</p>
        )}
        <div className="mt-5 flex gap-2">
          <button className={btn.primary} onClick={reset}>
            Try again
          </button>
        </div>
      </Card>
    </div>
  );
}
