import "server-only";
import type { SacramentMeeting } from "./types";

// Server Components need an absolute URL. Configure this on a deployed host;
// never derive a server-side fetch destination from an untrusted Host header.
function apiUrl(path: string): URL {
  const origin = process.env.MEETINGS_API_ORIGIN ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`;
  return new URL(path, origin);
}

export async function fetchMeetings(date?: string): Promise<SacramentMeeting[]> {
  const url = apiUrl("/api/meetings");
  if (date) url.searchParams.set("date", date);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load meetings (${response.status}).`);
  const meetings: SacramentMeeting[] = await response.json();
  return meetings;
}

export async function fetchMeetingById(id: number): Promise<SacramentMeeting | null> {
  const response = await fetch(apiUrl(`/api/meetings/${id}`), { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load the meeting (${response.status}).`);
  const meeting: SacramentMeeting = await response.json();
  return meeting;
}