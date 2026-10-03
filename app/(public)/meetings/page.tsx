import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense, type ReactElement } from "react";
import MeetingCard from "@/components/MeetingCard";
import MeetingLoading from "@/components/MeetingLoading";
import { MeetingSearch } from "@/components/MeetingSearch";
import { Pagination } from "@/components/Pagination";
import { countMeetings, getMeetings, type MeetingFilters } from "@/lib/meetings-db";
import { getMostRecentSunday, getWardDate, isValidDate } from "@/lib/dates";
import { getTotalPages, parsePage, RESULTS_SUMMARY_ID } from "@/lib/pagination";

export const metadata: Metadata = { title: "Meetings" };
interface MeetingsPageProps { searchParams: Promise<{ date?: string | string[]; query?: string | string[]; page?: string | string[] }> }

function EmptyResults({ searching }: { searching: boolean }): ReactElement {
  return (
    <div className="rounded-2xl border border-line bg-paper p-10 text-center">
      <h2 className="font-display text-2xl">{searching ? "No meetings match your search" : "No meeting scheduled for this date"}</h2>
      <p className="my-4 text-muted">{searching ? "Try a different name or meeting type." : "Try another Sunday or browse the available programmes."}</p>
      <Link href="/meetings" className="button-secondary">View all meetings</Link>
    </div>
  );
}

// Streams in under its own Suspense boundary so the skeleton shows while each page loads.
async function MeetingGrid({ filters, page }: { filters: MeetingFilters; page: number }): Promise<ReactElement> {
  const meetings = await getMeetings({ ...filters, page });
  const sunday = getMostRecentSunday();
  const today = getWardDate();
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{meetings.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} isCurrent={meeting.date === sunday} isUpcoming={meeting.date > today} />)}</div>;
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps): Promise<ReactElement> {
  await connection();
  const { date, query, page } = await searchParams;
  const dateFilter = typeof date === "string" ? date : undefined;
  const queryFilter = typeof query === "string" && query.trim() ? query.trim() : undefined;
  const valid = date === undefined || (dateFilter !== undefined && isValidDate(dateFilter));
  const filters: MeetingFilters = { date: dateFilter, query: queryFilter };
  // Count first so an out-of-range ?page= shows the last real page instead of nothing.
  const total = valid ? await countMeetings(filters) : 0;
  const totalPages = getTotalPages(total);
  const currentPage = parsePage(page, totalPages);
  const programmes = `${total} service ${total === 1 ? "programme" : "programmes"}`;
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div><h1 className="font-display text-4xl sm:text-5xl">Meeting programmes</h1><p className="mt-4 max-w-xl leading-7 text-muted">Prepare for Sunday, follow along with the agenda, or revisit a previous meeting.</p></div>
        <Link href="/meetings/current" className="button-primary no-print">This Sunday&apos;s programme <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="no-print mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-paper p-4">
        <Suspense><MeetingSearch /></Suspense>
        <form action="/meetings" className="flex flex-wrap items-end gap-3">
          {/* Keep the current search when a date is submitted. */}
          {queryFilter && <input type="hidden" name="query" value={queryFilter} />}
          <div><label htmlFor="meeting-date" className="mb-2 block text-sm font-semibold">Find a meeting by date</label><input key={dateFilter ?? "all"} id="meeting-date" name="date" type="date" required defaultValue={valid && dateFilter ? dateFilter : ""} className="min-h-11 rounded-lg border border-muted bg-white px-3 py-2 text-ink" /></div>
          <button type="submit" className="button-secondary">Find meeting</button>
        </form>
        {(date !== undefined || queryFilter) && <Link href="/meetings" className="inline-flex min-h-11 items-center px-3 text-sm text-link">Clear filter</Link>}
      </div>
      {!valid ? <p role="alert" className="rounded-xl border border-line bg-paper p-6">Please enter a valid date in YYYY-MM-DD format.</p> : <>
        {/* Rendered for every result, including none, so screen readers hear each change (WCAG 4.1.3). */}
        <p id={RESULTS_SUMMARY_ID} role="status" tabIndex={-1} className="mb-4 rounded-sm text-sm text-muted">
          {queryFilter ? `${programmes} matching “${queryFilter}”` : programmes}
          {total > 0 && ` · Page ${currentPage} of ${totalPages} · Most recent meetings first; upcoming dates last`}
        </p>
        {total === 0 ? <EmptyResults searching={queryFilter !== undefined} /> : <>
          <Suspense key={`${dateFilter ?? ""}|${queryFilter ?? ""}|${currentPage}`} fallback={<MeetingLoading />}>
            <MeetingGrid filters={filters} page={currentPage} />
          </Suspense>
          <Suspense><Pagination totalPages={totalPages} /></Suspense>
        </>}
      </>}
    </>
  );
}