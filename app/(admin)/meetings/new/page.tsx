import type { Metadata } from "next";
import type { ReactElement } from "react";

export const metadata: Metadata = { title: "Create meeting" };
export default function NewMeetingPage(): ReactElement {
  return <h1 className="font-display text-4xl sm:text-5xl">Create Meeting — Coming in Week 04</h1>;
}