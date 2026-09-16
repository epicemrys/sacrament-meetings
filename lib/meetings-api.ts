import type { SacramentMeeting } from "./types";

// Called from Client Components after hydration. Relative URLs target the same
// deployment and retain the browser's session on protected Vercel previews.
export async function fetchMeetings(date?: string, signal?: AbortSignal): Promise<SacramentMeeting[]> {
  const query = date ? `?${new URLSearchParams({ date })}` : "";
  const response = await fetch(`/api/meetings${query}`, {
    cache: "no-store", credentials: "same-origin", signal,
  });
  if (!response.ok) throw new Error(`Could not load meetings (${response.status}).`);
  const meetings: SacramentMeeting[] = await response.json();
  return meetings;
}

export async function fetchMeetingById(id: number, signal?: AbortSignal): Promise<SacramentMeeting | null> {
  const response = await fetch(`/api/meetings/${id}`, {
    cache: "no-store", credentials: "same-origin", signal,
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load the meeting (${response.status}).`);
  const meeting: SacramentMeeting = await response.json();
  return meeting;
}