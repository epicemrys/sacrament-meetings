"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactElement } from "react";
import { fetchMeetingById, fetchMeetings } from "@/lib/meetings-api";
import type { SacramentMeeting } from "@/lib/types";
import MeetingCard from "./MeetingCard";
import MeetingDetail from "./MeetingDetail";
import MeetingLoading from "./MeetingLoading";
import MeetingNotFound from "./MeetingNotFound";

type QueryState<T> = { status: "loading" } | { status: "error" } | { status: "success"; data: T };
interface SettledQuery<T> { key: string; attempt: number; result: QueryState<T> }
interface QueryResult<T> { state: QueryState<T>; retry: () => void }

function useMeetingQuery<T>(key: string, fetcher: (signal: AbortSignal) => Promise<T>): QueryResult<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<SettledQuery<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal).then((data: T) => {
      if (!controller.signal.aborted) setSettled({ key, attempt, result: { status: "success", data } });
    }).catch(() => {
      if (!controller.signal.aborted) setSettled({ key, attempt, result: { status: "error" } });
    });
    return () => controller.abort();
  }, [key, fetcher, attempt]);

  // A changed filter or retry immediately shows loading instead of stale data.
  const state: QueryState<T> = settled?.key === key && settled.attempt === attempt
    ? settled.result : { status: "loading" };
  return { state, retry: () => setAttempt((value) => value + 1) };
}

function QueryError({ retry, heading = "h2" }: { retry: () => void; heading?: "h1" | "h2" }): ReactElement {
  const Heading = heading;
  return <div role="alert" className="rounded-2xl border border-line bg-paper p-10"><Heading className="font-display text-3xl">Unable to load the programme</Heading><p className="my-5 text-muted">We couldn&apos;t retrieve the meeting information. Please try again.</p><button type="button" onClick={retry} className="button-primary">Please try again</button></div>;
}

interface MeetingListProps { date?: string; sunday: string; today: string }

export function MeetingList({ date, sunday, today }: MeetingListProps): ReactElement {
  const fetcher = useCallback((signal: AbortSignal) => fetchMeetings(date, signal), [date]);
  const { state, retry } = useMeetingQuery(date ?? "all", fetcher);
  if (state.status === "loading") return <MeetingLoading />;
  if (state.status === "error") return <QueryError retry={retry} />;
  const meetings = state.data;
  if (!meetings.length) return <div className="rounded-2xl border border-line bg-paper p-10 text-center"><h2 className="font-display text-2xl">No meeting scheduled for this date</h2><p className="my-4 text-muted">Try another Sunday or browse the available programmes.</p><Link href="/meetings" className="button-secondary">View all meetings</Link></div>;
  return <>
    <p className="mb-4 text-sm text-muted">{meetings.length} service {meetings.length === 1 ? "programme" : "programmes"} · Most recent meetings first; upcoming dates last</p>
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{meetings.map((meeting: SacramentMeeting) => <MeetingCard key={meeting.id} meeting={meeting} isCurrent={meeting.date === sunday} isUpcoming={meeting.date > today} />)}</div>
  </>;
}

export function MeetingAgenda({ id }: { id: number }): ReactElement {
  const fetcher = useCallback((signal: AbortSignal) => fetchMeetingById(id, signal), [id]);
  const { state, retry } = useMeetingQuery(String(id), fetcher);
  if (state.status === "loading") return <MeetingLoading />;
  if (state.status === "error") return <QueryError retry={retry} heading="h1" />;
  if (!state.data) return <MeetingNotFound />;
  return <MeetingDetail meeting={state.data} />;
}