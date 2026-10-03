import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactElement } from "react";
import { getCurrentMeeting, gospelSources } from "@/lib/meetings-db";
import { formatMeetingDate, getMostRecentSunday } from "@/lib/dates";
import { WARD_NAME } from "@/lib/ward";

export default async function Home(): Promise<ReactElement> {
  await connection();
  const current = await getCurrentMeeting();
  return (
    <div className="page-shell py-10 sm:py-14">
      <section className="grid overflow-hidden rounded-3xl border border-line bg-paper lg:grid-cols-[1.1fr_1fr]" aria-labelledby="welcome-heading">
        <div className="flex flex-col justify-center p-7 sm:p-12">
          <p className="eyebrow">Welcome to {WARD_NAME}</p>
          <h1 id="welcome-heading" className="mt-5 font-display text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">A moment to gather.<br /><span className="italic">A time to remember.</span></h1>
          <p className="mt-6 max-w-md leading-8 text-muted">Join us in worship as we remember Jesus Christ, share our faith, and strengthen one another.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/meetings/current" className="button-primary">This Sunday&apos;s programme <span aria-hidden="true">↗</span></Link><Link href="/meetings" className="button-secondary">All meetings</Link></div>
          <p className="mt-7 text-xs text-muted">You are welcome here.</p>
        </div>
        <div className="flex items-center bg-sage"><Image src="/chapel.svg" alt="Illustration of a welcoming chapel surrounded by trees in warm morning light" width={960} height={1080} sizes="(max-width: 1023px) 100vw, 50vw" preload className="h-auto w-full" /></div>
      </section>
      <section aria-labelledby="sunday-heading" className="my-10 grid gap-6 rounded-2xl bg-ink p-7 text-white sm:p-9 md:grid-cols-[1fr_auto] md:items-center">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-[#d4dfd3]">This week at a glance</p><h2 id="sunday-heading" className="mt-3 font-display text-2xl sm:text-3xl">{formatMeetingDate(getMostRecentSunday())}</h2><p className="mt-3 max-w-2xl leading-7 text-[#e4eae3]">{current ? `Conducting: ${current.conducting}. View the complete order of service, hymns, and messages.` : "A programme has not been added for this Sunday yet. Browse the available meeting dates."}</p></div>
        <Link href={current ? `/meetings/${current.id}` : "/meetings"} className="inline-flex min-h-11 items-center justify-center gap-4 rounded-lg bg-white px-5 py-3 text-sm font-bold text-ink hover:bg-sage">{current ? "View full agenda" : "Browse programmes"}<span aria-hidden="true">→</span></Link>
      </section>
      <section aria-labelledby="prepare-heading" className="grid gap-8 border-t border-line py-8 md:grid-cols-2">
        <div><p className="eyebrow">Prepare for Sunday</p><h2 id="prepare-heading" className="mt-4 font-display text-3xl">Worship, wherever you begin.</h2><p className="mt-4 max-w-md leading-8 text-muted">Explore the scriptures and hymns in Gospel Library. Each programme includes the order of service and can be printed to follow along.</p></div>
        <div><h3 className="mb-3 font-semibold">From Gospel Library</h3><ul className="divide-y divide-line">{gospelSources.map((source) => <li key={source.url}><a href={source.url} className="flex min-h-11 items-center justify-between gap-4 py-3 text-sm text-link">{source.title}<span aria-hidden="true">↗</span></a></li>)}</ul><p className="mt-4 text-xs leading-6 text-muted">Agenda topics draw on these official Church resources.</p></div>
      </section>
    </div>
  );
}