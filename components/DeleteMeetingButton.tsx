"use client";

import type { FormEvent, ReactElement } from "react";
import { useFormStatus } from "react-dom";
import { deleteMeeting } from "@/lib/actions";
import { RESULTS_SUMMARY_ID } from "@/lib/pagination";

function SubmitButton({ dateLabel }: { dateLabel: string }): ReactElement {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="button-danger">
      {pending ? "Deleting…" : "Delete"}<span className="sr-only"> meeting on {dateLabel}</span>
    </button>
  );
}

export default function DeleteMeetingButton({ id, dateLabel }: { id: number; dateLabel: string }): ReactElement {
  const deleteMeetingWithId = deleteMeeting.bind(null, id);

  async function deleteAndRefocus(): Promise<void> {
    await deleteMeetingWithId();
    document.getElementById(RESULTS_SUMMARY_ID)?.focus();
  }

  function confirmDelete(event: FormEvent<HTMLFormElement>): void {
    if (!window.confirm(`Delete the meeting on ${dateLabel}? This cannot be undone.`)) event.preventDefault();
  }

  return (
    <form action={deleteAndRefocus} onSubmit={confirmDelete}>
      <SubmitButton dateLabel={dateLabel} />
    </form>
  );
}