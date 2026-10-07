import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata, ResolvingMetadata } from "next";
import type { ReactElement } from "react";
import { MeetingAgenda } from "@/components/MeetingApiViews";
import { formatMeetingDate, parseMeetingId } from "@/lib/dates";
import { meetingTypeLabels } from "@/lib/meeting-labels";
import { getMeetingById } from "@/lib/meetings-db";

interface MeetingPageProps { params: Promise<{ id: string }> }

const fallbackMetadata: Metadata = {
  title: "Meeting programme",
  description: "The order of service, hymns, and speakers for a sacrament meeting.",
};

// Each programme gets its own title and description, so a shared link names the date.
export async function generateMetadata({ params }: MeetingPageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const id = parseMeetingId((await params).id);
  if (id === null) return fallbackMetadata;
  // The agenda itself loads in the browser, so a failed lookup here only costs the specific title.
  const meeting = await getMeetingById(id).catch(() => null);
  if (!meeting) return fallbackMetadata;
  const title = `${meetingTypeLabels[meeting.meetingType]}, ${formatMeetingDate(meeting.date)}`;
  const speakers = meeting.speakers.filter((item) => item.type === "speaker").map((item) => item.name);
  const description = `Order of service for ${formatMeetingDate(meeting.date)}. Conducting: ${meeting.conducting}.`
    + (speakers.length ? ` Speakers: ${speakers.join(", ")}.` : "");
  // A page's openGraph replaces the parent's whole object, so carry the site image forward.
  const images = (await parent).openGraph?.images ?? [];
  return {
    title,
    description,
    openGraph: { type: "article", title, description, url: `/meetings/${meeting.id}`, images },
  };
}

export default async function MeetingPage({ params }: MeetingPageProps): Promise<ReactElement> {
  await connection();
  const { id: rawId } = await params;
  const id = parseMeetingId(rawId);
  if (id === null) notFound();
  return <><Link href="/meetings" className="no-print mb-5 inline-flex min-h-11 items-center text-sm text-link">← All meetings</Link><MeetingAgenda id={id} /></>;
}