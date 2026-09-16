import Link from "next/link";
import type { ReactElement } from "react";

export default function MeetingNotFound(): ReactElement {
  return <div className="rounded-2xl border border-line bg-paper p-10 text-center"><p className="eyebrow">Programme unavailable</p><h1 className="mt-3 font-display text-3xl">Meeting not found</h1><p className="my-5 text-muted">This meeting link is invalid or the programme is not available.</p><Link href="/meetings" className="button-primary">Browse meetings</Link></div>;
}