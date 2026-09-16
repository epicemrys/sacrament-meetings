import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import MeetingDetail from "@/components/MeetingDetail";
import { fetchMeetingById } from "@/lib/meetings-api";
import { parseMeetingId } from "@/lib/dates";

export const metadata: Metadata = { title: "Meeting programme" };
interface MeetingPageProps { params: Promise<{ id: string }> }

export default async function MeetingPage({ params }: MeetingPageProps): Promise<ReactElement> {
  await connection();
  const { id: rawId } = await params;
  const id = parseMeetingId(rawId);
  if (id === null) notFound();
  const meeting = await fetchMeetingById(id);
  if (!meeting) notFound();
  return <><Link href="/meetings" className="no-print mb-5 inline-flex min-h-11 items-center text-sm text-link">← All meetings</Link><MeetingDetail meeting={meeting} /></>;
}