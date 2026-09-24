import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { parseMeetingId } from "@/lib/dates";

export const metadata: Metadata = { title: "Edit meeting" };
interface EditMeetingPageProps { params: Promise<{ id: string }> }

export default async function EditMeetingPage({ params }: EditMeetingPageProps): Promise<ReactElement> {
  const { id: rawId } = await params;
  const id = parseMeetingId(rawId);
  if (id === null) notFound();
  return (
    <>
      <h1 className="font-display text-4xl sm:text-5xl">Edit Meeting — Coming in Week 04</h1>
      <p className="mt-4 text-muted">Programme {id}</p>
    </>
  );
}