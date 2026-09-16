import type { ReactElement, ReactNode } from "react";
import { connection } from "next/server";
import NavLinks from "@/components/NavLinks";
import { getCurrentMeeting } from "@/lib/meetings-db";

export default async function MeetingsLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  await connection();
  const current = getCurrentMeeting();
  return (
    <div className="page-shell meetings-content py-8 sm:py-10">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <p className="eyebrow">Sunday programmes</p>
        <NavLinks label="Meetings navigation" links={[
          { href: "/meetings", label: "All meetings", exact: true },
          { href: current ? `/meetings/${current.id}` : "/meetings/current", label: "This Sunday", exact: true },
        ]} />
      </div>
      {children}
    </div>
  );
}