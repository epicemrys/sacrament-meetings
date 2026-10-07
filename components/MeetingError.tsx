"use client";

import Link from "next/link";
import { useEffect, type ReactElement } from "react";

export interface MeetingErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

// Shared by the error.tsx files in both meetings route groups.
export default function MeetingError({ error, retry }: MeetingErrorProps): ReactElement {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-4xl rounded-2xl border border-line bg-paper p-10">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="my-5 text-muted">We couldn&apos;t load or save the meeting information. Your connection or the database may be briefly unavailable. Please try again.</p>
      {error.digest && <p className="mb-5 text-xs text-muted">Reference: {error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="button-primary">Try again</button>
        <Link href="/meetings" className="button-secondary">Back to all meetings</Link>
      </div>
    </div>
  );
}