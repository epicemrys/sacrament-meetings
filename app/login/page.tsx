import Link from "next/link";
import type { Metadata } from "next";
import type { ReactElement } from "react";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Leader sign in",
  description: "Bishopric members sign in to create, edit, and delete sacrament meeting programmes.",
  robots: { index: false },
};

interface LoginPageProps { searchParams: Promise<{ callbackUrl?: string | string[] }> }

// Keep only the path and query, so a crafted callbackUrl can't send a leader to another site.
function safeRedirect(callbackUrl: string | string[] | undefined): string {
  if (typeof callbackUrl !== "string") return "/meetings";
  try {
    const { pathname, search } = new URL(callbackUrl, "http://localhost");
    return pathname === "/login" ? "/meetings" : `${pathname}${search}`;
  } catch {
    return "/meetings";
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps): Promise<ReactElement> {
  const { callbackUrl } = await searchParams;
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-paper p-7 sm:p-10">
        <p className="eyebrow">Leader tools</p>
        <h1 className="mt-4 font-display text-4xl">Sign in</h1>
        <p className="mb-8 mt-4 leading-7 text-muted">Bishopric members sign in to plan and update meeting programmes.</p>
        <LoginForm redirectTo={safeRedirect(callbackUrl)} />
        <Link href="/meetings" className="mt-6 inline-flex min-h-11 items-center text-sm text-link">← Back to meetings</Link>
      </div>
    </div>
  );
}