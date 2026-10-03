import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentMeeting } from "@/lib/meetings-db";

export default async function CurrentMeetingPage(): Promise<never> {
  await connection();
  const meeting = await getCurrentMeeting();
  if (!meeting) {
    redirect("/meetings");
  }
  redirect(meeting ? `/meetings/${meeting.id}` : "/meetings");
}