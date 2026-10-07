import Link from "next/link";
import type { ReactElement } from "react";
import { formatMeetingDate } from "@/lib/dates";
import { meetingTypeLabels } from "@/lib/meeting-labels";
import type { SacramentMeeting } from "@/lib/types";
import DeleteMeetingButton from "./DeleteMeetingButton";

interface MeetingCardProps {
  meeting: SacramentMeeting;
  isCurrent?: boolean;
  isUpcoming?: boolean;
  canManage?: boolean;
}

export default function MeetingCard({ meeting, isCurrent = false, isUpcoming = false, canManage = false }: MeetingCardProps): ReactElement {
  const speakers = meeting.speakers.filter((item) => item.type === "speaker");
  const dateLabel = formatMeetingDate(meeting.date);
  return (
    <article className="meeting-card flex h-full flex-col rounded-2xl border border-line bg-paper p-6 transition-shadow hover:shadow-md">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">{meetingTypeLabels[meeting.meetingType]}</p>
        {isCurrent && <span className="rounded-full bg-sage px-3 py-1 text-xs font-bold text-ink">This Sunday</span>}
        {isUpcoming && <span className="rounded-full border border-line px-3 py-1 text-xs font-bold text-muted">Upcoming</span>}
      </div>
      <h2 className="font-display text-2xl leading-snug"><Link href={`/meetings/${meeting.id}`} className="rounded-sm hover:underline"><time dateTime={meeting.date}>{dateLabel}</time></Link></h2>
      <p className="mt-4 text-sm text-muted">Conducting · {meeting.conducting}</p>
      <p className="mt-3 flex-1 text-sm leading-7">{meeting.meetingType === "testimony" ? "An opportunity to share your testimony of Jesus Christ and His gospel." : speakers.map((speaker) => speaker.topic).join(" · ") || "View the full meeting programme."}</p>
      <Link href={`/meetings/${meeting.id}`} aria-label={`View agenda for ${dateLabel}`} className="mt-6 inline-flex min-h-11 items-center justify-between border-t border-line pt-4 text-sm font-bold text-ink">View agenda <span aria-hidden="true">↗</span></Link>
      {canManage && <div className="no-print mt-3 flex flex-wrap gap-3">
        {/* No prefetch: proxy.ts renews the session cookie on leader routes, and a prefetch
            still in flight at sign-out would put the cookie back. */}
        <Link href={`/meetings/${meeting.id}/edit`} prefetch={false} className="button-secondary">Edit<span className="sr-only"> meeting on {dateLabel}</span></Link>
        <DeleteMeetingButton id={meeting.id} dateLabel={dateLabel} />
      </div>}
    </article>
  );
}