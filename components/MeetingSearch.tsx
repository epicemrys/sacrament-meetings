"use client";

import { useEffect, useRef, type ReactElement } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

// The URL is the source of truth, so the input is uncontrolled and starts from ?query=.
export function MeetingSearch(): ReactElement {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { push } = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const query = searchParams.get("query");
  const written = useRef(query);

  useEffect(() => {
    if (query === written.current) return;
    written.current = query;
    if (input.current) input.current.value = query ?? "";
  }, [query]);

  // Wait for a pause in typing so each keystroke doesn't trigger a database query.
  // push (not replace) adds one history entry per search, so Back returns to the previous one.
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", "1"); // Here I always reset to page 1 on a new search
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    written.current = term || null;
    push(`${pathname}?${params.toString()}`, { scroll: false });
  }, 300);

  return (
    <div className="min-w-0 flex-1 basis-64">
      <label htmlFor="meeting-search" className="mb-2 block text-sm font-semibold">Search meetings</label>
      <input
        ref={input}
        id="meeting-search"
        type="search"
        placeholder="Search by speaker, leader, or meeting type..."
        defaultValue={query ?? undefined}
        onChange={(event) => handleSearch(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-muted bg-white px-3 py-2 text-ink"
      />
    </div>
  );
}