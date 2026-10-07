import Link from "next/link";
import { connection } from "next/server";
import type { ReactElement } from "react";
import NavLinks from "./NavLinks";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/auth-actions";
import { formatMeetingDate, getWardDate } from "@/lib/dates";
import { WARD_NAME } from "@/lib/ward";

export default async function Header(): Promise<ReactElement> {
  await connection();
  const today = getWardDate();
  const session = await auth();
  return (
    <header className="site-header border-b border-line bg-paper">
      <div className="page-shell flex flex-wrap items-center justify-between gap-5 py-5">
        <Link href="/" className="flex items-center gap-3 rounded-md" aria-label={`${WARD_NAME} home`}>
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-ink text-xl text-white">B</span>
          <span><span className="block text-lg font-bold tracking-tight">{WARD_NAME}</span>
            <span className="block text-xs tracking-wide text-muted">SACRAMENT MEETINGS</span></span>
        </Link>
        <div className="flex flex-wrap items-center gap-5">
          <time dateTime={today} className="header-date text-xs text-muted">{formatMeetingDate(today)}</time>
          <NavLinks label="Main navigation" links={[{ href: "/", label: "Home", exact: true }, { href: "/meetings", label: "Meetings" }]} />
          {session?.user ? (
            <form action={signOutAction} className="no-print flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted">Signed in as {session.user.name}</span>
              <button type="submit" className="button-secondary">Sign out</button>
            </form>
          ) : (
            <Link href="/login" className="no-print inline-flex min-h-11 items-center rounded-lg px-4 py-2 text-sm font-semibold text-muted hover:bg-sage hover:text-ink">Leader sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}