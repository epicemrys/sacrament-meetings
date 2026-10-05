import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { CreateMeetingForm } from "@/components/MeetingForm";
import { emptyMeetingFormValues } from "@/lib/meeting-form";

export const metadata: Metadata = { title: "Create meeting" };
export default function NewMeetingPage(): ReactElement {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/meetings" className="mb-5 inline-flex min-h-11 items-center text-sm text-link">← All meetings</Link>
      <h1 className="font-display text-4xl sm:text-5xl">Create meeting</h1>
      <p className="mb-8 mt-4 max-w-xl leading-7 text-muted">Plan a sacrament meeting programme. It appears in the meetings list as soon as you save it.</p>
      <CreateMeetingForm initialValues={emptyMeetingFormValues} />
    </div>
  );
}
