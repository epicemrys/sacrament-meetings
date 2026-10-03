"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactElement } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { parsePage, RESULTS_SUMMARY_ID } from "@/lib/pagination";

interface PaginationProps { totalPages: number }

const pageLink = "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold";

// Reads ?page= from the URL and keeps every other parameter, such as query and date.
export function Pagination({ totalPages }: PaginationProps): ReactElement | null {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentPage = parsePage(searchParams.get("page"), totalPages);
  // Set by a Previous/Next click, so a new search never pulls focus out of the search box.
  const moveFocus = useRef(false);

  // The clicked link can turn into a plain label on the first or last page, which would
  // drop keyboard focus to <body> (WCAG 2.4.3). Send it to the results summary instead.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    document.getElementById(RESULTS_SUMMARY_ID)?.focus();
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const hrefFor = (page: number): string => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `${pathname}?${params.toString()}`;
  };

  const control = (page: number, label: string, arrow: string, rel: "prev" | "next"): ReactElement => {
    const content = rel === "prev"
      ? <><span aria-hidden="true">{arrow}</span>{label}</>
      : <>{label}<span aria-hidden="true">{arrow}</span></>;
    const enabled = page >= 1 && page <= totalPages;
    return enabled
      ? <Link href={hrefFor(page)} rel={rel} onClick={() => { moveFocus.current = true; }} className={`${pageLink} border-ink bg-paper text-ink transition-colors hover:bg-sage`}>{content}</Link>
      : <span className={`${pageLink} cursor-not-allowed border-line text-muted`}>{content}<span className="sr-only"> (unavailable)</span></span>;
  };

  return (
    <nav aria-label="Pagination" className="no-print mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
      {control(currentPage - 1, "Previous", "←", "prev")}
      <p className="text-sm text-ink">
        Page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span>
      </p>
      {control(currentPage + 1, "Next", "→", "next")}
    </nav>
  );
}