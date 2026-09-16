import type { ReactElement } from "react";

export default function MeetingLoading(): ReactElement {
  return <div role="status" aria-live="polite"><p className="mb-6 text-muted">Loading meeting programme…</p><div aria-hidden="true" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-64 animate-pulse rounded-2xl border border-line bg-sage motion-reduce:animate-none" />)}</div></div>;
}