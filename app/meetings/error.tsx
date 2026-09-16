"use client";

import type { ReactElement } from "react";

interface MeetingErrorProps { error: Error & { digest?: string }; retry: () => void }

export default function MeetingError({ retry }: MeetingErrorProps): ReactElement {
  return <div role="alert" className="rounded-2xl border border-line bg-paper p-10"><h1 className="font-display text-3xl">Unable to load the programme</h1><p className="my-5 text-muted">We couldn&apos;t retrieve the meeting information. Please try again.</p><button type="button" onClick={retry} className="button-primary">Please try again</button></div>;
}