import { NextResponse } from "next/server";
import { getMeetingById } from "@/lib/meetings-db";
import { parseMeetingId } from "@/lib/dates";
import type { ApiError, SacramentMeeting } from "@/lib/types";

interface MeetingRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  { params }: MeetingRouteContext,
): Promise<NextResponse<SacramentMeeting | ApiError>> {
  const { id: rawId } = await params;
  const id = parseMeetingId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Meeting ID must be a positive, safe integer." }, { status: 400 });
  }
  const meeting = getMeetingById(id);
  if (!meeting) {
    return NextResponse.json({ error: "Sorry, meeting not found." }, { status: 404 });
  }
  return NextResponse.json(meeting);
}