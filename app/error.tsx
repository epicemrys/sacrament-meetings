"use client";

import type { ReactElement } from "react";

interface AppErrorProps { error: Error & { digest?: string }; retry: () => void }

// Catches errors from the home page and from layouts below the root, such as the meetings layout.
export default function AppError({ retry }: AppErrorProps): ReactElement {
  return (
    <div className="page-shell py-10">
      <div role="alert" className="rounded-2xl border border-line bg-paper p-10">
        <h1 className="font-display text-3xl">Unable to load the programme</h1>
        <p className="my-5 text-muted">We couldn&apos;t retrieve the meeting information. Please try again.</p>
        <button type="button" onClick={retry} className="button-primary">Please try again</button>
      </div>
    </div>
  );
}
