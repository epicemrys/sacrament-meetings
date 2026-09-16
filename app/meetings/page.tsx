import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import { MeetingList } from "@/components/MeetingApiViews";
import { getMostRecentSunday, getWardDate, isValidDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Meetings" };
interface MeetingsPageProps { searchParams: Promise<{ date?: string | string[] }> }

export default async function MeetingsPage({ searchParams }: MeetingsPageProps): Promise<ReactElement> {
  await connection();
  const { date } = await searchParams;
  const valid = date === undefined || (typeof date === "string" && isValidDate(date));
  const sunday = getMostRecentSunday();
  const today = getWardDate();
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div><h1 className="font-display text-4xl sm:text-5xl">Meeting programmes</h1><p className="mt-4 max-w-xl leading-7 text-muted">Prepare for Sunday, follow along with the agenda, or revisit a previous meeting.</p></div>
        <Link href="/meetings/current" className="button-primary no-print">This Sunday&apos;s programme <span aria-hidden="true">↗</span></Link>
      </div>
      <form action="/meetings" className="no-print mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-4">
        <div><label htmlFor="meeting-date" className="mb-2 block text-sm font-semibold">Find a meeting by date</label><input key={typeof date === "string" ? date : "all"} id="meeting-date" name="date" type="date" required defaultValue={valid && typeof date === "string" ? date : ""} className="min-h-11 rounded-lg border border-muted bg-white px-3 py-2 text-ink" /></div>
        <button type="submit" className="button-secondary">Find meeting</button>
        {date !== undefined && <Link href="/meetings" className="inline-flex min-h-11 items-center px-3 text-sm text-link">Clear filter</Link>}
      </form>
      {!valid ? <p role="alert" className="rounded-xl border border-line bg-paper p-6">Please enter a valid date in YYYY-MM-DD format.</p> : <MeetingList date={typeof date === "string" ? date : undefined} sunday={sunday} today={today} />}
    </>
  );
}