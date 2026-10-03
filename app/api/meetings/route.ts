import { NextRequest, NextResponse } from "next/server";
import { getMeetings } from "@/lib/meetings-db";
import { isValidDate } from "@/lib/dates";
import type { ApiError, SacramentMeeting } from "@/lib/types";

export async function GET(request: NextRequest): Promise<NextResponse<SacramentMeeting[] | ApiError>> {
  const date = request.nextUrl.searchParams.get("date");
  if (date !== null && !isValidDate(date)) {
    return NextResponse.json({ error: "Use a valid date in YYYY-MM-DD format." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getMeetings({ date, query: request.nextUrl.searchParams.get("query") }));
  } catch (error) {
    console.error("GET /api/meetings failed", error);
    return NextResponse.json({ error: "Meetings are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
