import Link from "next/link";
import type { ReactElement } from "react";

export default function EditMeetingNotFound(): ReactElement {
  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-line bg-paper p-10 text-center">
      <p className="eyebrow">Nothing to edit</p>
      <h1 className="mt-3 font-display text-3xl">Meeting not found</h1>
      <p className="my-5 text-muted">This meeting may have been deleted, or the link is incorrect.</p>
      <Link href="/meetings" className="button-primary">Back to all meetings</Link>
    </div>
  );
}