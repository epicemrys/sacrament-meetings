import type { ReactElement, ReactNode } from "react";
import { connection } from "next/server";
import NavLinks from "@/components/NavLinks";
import { getCurrentMeeting } from "@/lib/meetings-db";

export default async function MeetingsLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  await connection();
  // error.tsx in this folder can't catch errors thrown by this layout, so a failed
  // lookup falls back to the redirect route instead of breaking every meetings page.
  const current = await getCurrentMeeting().catch((error: unknown) => {
    console.error("Could not look up this Sunday's meeting for navigation", error);
    return null;
  });
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