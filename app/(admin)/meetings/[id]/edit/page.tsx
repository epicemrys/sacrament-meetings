import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { EditMeetingForm } from "@/components/MeetingForm";
import { formatMeetingDate, parseMeetingId } from "@/lib/dates";
import { toMeetingFormValues } from "@/lib/meeting-form";
import { getMeetingById } from "@/lib/meetings-db";
import { requireLeader } from "@/lib/session";

export const metadata: Metadata = {
  title: "Edit meeting",
  description: "Update a sacrament meeting programme.",
  robots: { index: false },
};
interface EditMeetingPageProps { params: Promise<{ id: string }> }

export default async function EditMeetingPage({ params }: EditMeetingPageProps): Promise<ReactElement> {
  const { id: rawId } = await params;
  await requireLeader(`/meetings/${encodeURIComponent(rawId)}/edit`);
  const id = parseMeetingId(rawId);
  if (id === null) notFound();
  // A database failure throws here and is shown by error.tsx.
  const meeting = await getMeetingById(id);
  if (!meeting) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/meetings" className="mb-5 inline-flex min-h-11 items-center text-sm text-link">← All meetings</Link>
      <h1 className="font-display text-4xl sm:text-5xl">Edit meeting</h1>
      <p className="mb-8 mt-4 max-w-xl leading-7 text-muted">
        Programme {meeting.id} · <time dateTime={meeting.date}>{formatMeetingDate(meeting.date)}</time>
      </p>
      <EditMeetingForm meetingId={meeting.id} initialValues={toMeetingFormValues(meeting)} />
    </div>
  );
}
