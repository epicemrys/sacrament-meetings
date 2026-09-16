import { NextRequest, NextResponse } from "next/server";
import { getMeetings } from "@/lib/meetings-db";
import { isValidDate } from "@/lib/dates";
import type { ApiError, SacramentMeeting } from "@/lib/types";

export function GET(request: NextRequest): NextResponse<SacramentMeeting[] | ApiError> {
  const date = request.nextUrl.searchParams.get("date");
  if (date !== null && !isValidDate(date)) {
    return NextResponse.json({ error: "Use a valid date in YYYY-MM-DD format." }, { status: 400 });
  }
  return NextResponse.json(getMeetings(date));
}