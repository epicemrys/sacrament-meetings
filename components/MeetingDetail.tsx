import type { ReactElement, ReactNode } from "react";
import { formatMeetingDate } from "@/lib/dates";
import { meetingTypeLabels } from "@/lib/meeting-labels";
import { WARD_NAME } from "@/lib/ward";
import type { Hymn, SacramentMeeting } from "@/lib/types";
import PrintButton from "./PrintButton";

interface MeetingDetailProps { meeting: SacramentMeeting }
interface AgendaRowProps { label: string; children: ReactNode }

function AgendaRow({ label, children }: AgendaRowProps): ReactElement {
  return <div className="agenda-row grid gap-2 border-b border-line py-4 sm:grid-cols-[11rem_1fr]"><dt className="text-sm font-semibold text-muted">{label}</dt><dd className="leading-7">{children}</dd></div>;
}

function HymnTitle({ hymn }: { hymn: Hymn }): ReactElement {
  return <span><span className="mr-2 text-sm text-muted">#{hymn.number}</span>{hymn.title}</span>;
}

export default function MeetingDetail({ meeting }: MeetingDetailProps): ReactElement {
  return (
    <article className="print-programme mx-auto max-w-4xl rounded-2xl border border-line bg-paper p-6 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5 border-b-2 border-ink pb-7">
        <div>
          <p className="eyebrow">{WARD_NAME} · Programme {meeting.id}</p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl">{meetingTypeLabels[meeting.meetingType]}</h1>
          <p className="mt-3 text-muted"><time dateTime={meeting.date}>{formatMeetingDate(meeting.date)}</time></p>
        </div>
        <PrintButton />
      </div>
      <p className="my-4 text-xs text-muted">All participant assignments are inspired by the needs of the ward and the guidance of the Spirit.</p>
      <dl>
        <AgendaRow label="Presiding">{meeting.presiding}</AgendaRow>
        <AgendaRow label="Conducting">{meeting.conducting}</AgendaRow>
      </dl>
      <section aria-labelledby="opening-heading" className="mt-7">
        <h2 id="opening-heading" className="agenda-heading">Welcome & opening</h2>
        <dl>
          <AgendaRow label="Opening hymn"><HymnTitle hymn={meeting.openingHymn} /></AgendaRow>
          <AgendaRow label="Opening prayer">{meeting.openingPrayer}</AgendaRow>
          <AgendaRow label="Ward business">{meeting.wardBusiness.length ? <ul className="list-inside list-disc space-y-1">{meeting.wardBusiness.map((item, index) => <li key={index}>{item.description}</li>)}</ul> : "No ward business scheduled."}</AgendaRow>
          <AgendaRow label="Stake business">{meeting.stakeBusiness ? "Stake business will be presented." : "No stake business scheduled."}</AgendaRow>
        </dl>
      </section>
      <section aria-labelledby="sacrament-heading" className="mt-7">
        <h2 id="sacrament-heading" className="agenda-heading">The sacrament</h2>
        <dl><AgendaRow label="Sacrament hymn"><HymnTitle hymn={meeting.sacramentHymn} /></AgendaRow></dl>
        <p className="py-4 text-sm italic text-muted">Blessing and passing of the sacrament</p>
      </section>
      <section aria-labelledby="messages-heading" className="mt-7">
        <h2 id="messages-heading" className="agenda-heading">{meeting.meetingType === "testimony" ? "Bearing testimony" : "Messages & music"}</h2>
        {meeting.meetingType === "testimony" && <p className="py-4 leading-7">Members of the congregation are invited to share brief testimonies of Jesus Christ and His gospel.</p>}
        {meeting.speakers.length > 0 ? <dl>{meeting.speakers.map((item, index) => (
          <AgendaRow key={index} label={item.type === "musical-number" ? "Musical number" : "Speaker"}>
            <p className="font-semibold">{item.name}</p>
            <p className="text-sm text-muted">{item.topic || "Selection to be announced"}</p>
            {item.reference && <a href={item.reference.url} className="text-link text-xs">{item.reference.title}</a>}
          </AgendaRow>
        ))}</dl> : <p className="pb-4 text-sm text-muted">No assigned speakers or musical numbers.</p>}
      </section>
      <section aria-labelledby="closing-heading" className="mt-7">
        <h2 id="closing-heading" className="agenda-heading">Closing</h2>
        <dl>
          <AgendaRow label="Closing hymn"><HymnTitle hymn={meeting.closingHymn} /></AgendaRow>
          <AgendaRow label="Closing prayer">{meeting.closingPrayer}</AgendaRow>
        </dl>
      </section>
      <section aria-labelledby="announcements-heading" className="mt-7 rounded-xl bg-canvas p-5">
        <h2 id="announcements-heading" className="text-base font-bold">Ward announcements</h2>
        {meeting.announcements?.length ? <ul className="mt-3 list-inside list-disc space-y-2 text-sm leading-7">{meeting.announcements.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-2 text-sm text-muted">No announcements for this meeting.</p>}
      </section>
    </article>
  );
}