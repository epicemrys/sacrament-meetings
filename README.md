# Bariga Ward · Sacrament Meetings
# Charles Ukoh 
# Wdd 430 WK02 Course Assignment

This is a Next.js App Router coursework project that reads sacrament meeting programmes from a Neon Postgres database, with search, pagination, Gospel Library references, accessible navigation, and printable agendas.

## Run locally

Use Node.js 20.9 or newer (this project was checked with Node.js 24).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Install dependencies before starting the server; npm uses the local Next.js command in `node_modules/.bin`.

The root layout loads Geist and Lora through `next/font/google`, so the first development compilation and production build need access to Google Fonts. Fonts are then served locally by Next.js. The locally authored chapel illustration uses `next/image` with an explicit aspect ratio.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Welcome page and this week's programme |
| `/meetings` | This Sunday's programme first, then upcoming programmes (nearest date first), then past programmes (newest first) |
| `/meetings?date=2026-01-04` | Filter the list by calendar date |
| `/meetings?query=Gimenez` | Search by speaker, presiding or conducting leader, or meeting type |
| `/meetings/[id]` | Full agenda with a Print programme button |
| `/meetings/current` | Redirect to this Sunday's agenda, or `/meetings` if absent |
| `/meetings/new` | Create a meeting (Server Action with server-side validation) |
| `/meetings/[id]/edit` | Edit a meeting; unknown IDs show a not-found page |
| `/api/meetings` | GET the collection |
| `/api/meetings?date=2026-01-04` | GET meetings for a valid ISO date |
| `/api/meetings/[id]` | GET one meeting; 400 for malformed IDs, 404 for missing IDs |

## Data and dates

- `lib/types.ts` defines the meeting, hymn, speaker, scripture reference, ward business, and API error types. Components and handlers have explicit types without `any`.
- `lib/meetings-db.ts` reads the `meetings` table in Neon Postgres through `neon()` tagged templates, so every value is parameterized. It exports async `getMeetings` (filters by `date` and `query`, and by `page` when given), `countMeetings`, `getMeetingById`, and `getCurrentMeeting`. `addMeeting`, `updateMeeting`, and `deleteMeeting` run parameterized INSERT, UPDATE, and DELETE statements. The connection string comes from `POSTGRES_URL` in `.env.local`.
- `lib/ward.ts` configures my ward `Bariga Ward` and `Africa/Lagos`. The header and Sunday lookup use this time zone, including near-midnight requests.
- “This Sunday” means the Sunday that ends the current week: today on a Sunday, otherwise the coming Sunday (`getThisSunday` in `lib/dates.ts`). Saturday, October 3, 2026 therefore resolves to the meeting on October 4, and that card carries the **This Sunday** tag. The seed runs weekly from October 4 to December 6, 2026, with fast and testimony meetings on first Sundays; the redirect falls back to the list for any week without a meeting.
- The nested layout supplies meetings navigation. `NavLinks` uses `usePathname` and `aria-current`; the section's current link points to the resolved detail page so its active state survives the redirect.

## How pages get their data

The meetings list is a Server Component: it reads `date` and `query` from `searchParams` and calls `getMeetings()` directly. `components/MeetingSearch.tsx` writes `?query=` to the URL with `router.push`, debounced by 300 ms through `use-debounce`, so typing doesn't query the database on every keystroke. Each search resets to `?page=1` and adds one history entry, so Back returns to the previous search. The input uses `defaultValue`, so the URL stays the source of truth and a refresh or shared link keeps the search.

`components/Pagination.tsx` reads `?page=` and renders Previous and Next links that keep `query` and `date`. The list shows six meetings per page (`MEETINGS_PAGE_SIZE` in `lib/pagination.ts`). The page counts matches first, so an out-of-range page number shows the last real page.

The agenda page renders through the typed Client Component in `components/MeetingApiViews.tsx`. After hydration, it calls `/api/meetings/[id]` through `lib/meetings-api.ts`, using `cache: "no-store"` and same-origin credentials. The API handlers remain server-side and query the database through `lib/meetings-db.ts`.

Relative browser URLs automatically follow the current domain and port, including each Vercel branch preview, and include the visitor's session cookies on protected previews. There is no server-side call to `127.0.0.1:3000`, and no `MEETINGS_API_ORIGIN` environment variable is required or used. An old value for that variable can be removed from Vercel settings.

# Vercel Deployment:
https://sacrament-meetings-blond.vercel.app

## Creating, editing, and deleting meetings

- `lib/actions.ts` (`'use server'`) holds the `createMeeting`, `updateMeeting`, and `deleteMeeting` Server Actions. Each create and update runs `MeetingFormSchema.safeParse` (Zod) on the raw `FormData` before writing. Failed validation returns `{ message, errors, values }` instead of throwing, and the form shows each message under its field.
- A second meeting on the same date breaks the table's UNIQUE constraint. The action returns this as a date field error.
- Unexpected database errors are logged and re-thrown with a friendly message. `app/(public)/meetings/error.tsx` and `app/(admin)/meetings/error.tsx` show it with **Try again** and **Back to all meetings**. In Next.js 16.3 the error boundary receives `retry()`, which re-fetches the segment. `reset()` would only re-render it.
- After each save the actions call `revalidatePath('/meetings')`. Create and update then `redirect('/meetings')`. Delete stays on the list, so the current search and page are kept, and focus moves to the results count.
- `components/MeetingForm.tsx` is a Client Component that uses `useActionState`. Each input has a `<label htmlFor>`, `aria-describedby` pointing to its error container (`aria-live="polite"`), and `aria-invalid` when it fails. After a failed save, focus moves to the first invalid field. Typed values are returned with the errors, so React's form reset doesn't clear them.
- Each meeting card has **Edit** and **Delete** controls. Delete asks for confirmation first.

## Quality checks

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

I installed Playwright. So please build before running tests. Playwright launches a separate production server on port 3100 and shuts it down afterward; keep that port free.

Tests cover create, edit, and delete through the forms (field errors, focus, duplicate dates, preserved references, not-found edit pages), date boundaries, search, pagination, URL state (reload, new tab, Back), focus after paging, screen-reader status updates, loading skeletons, collection filtering, 200/400/404/405 API responses, current-week navigation, active links, keyboard navigation, empty and not-found views, complete printable agendas, mobile overflow, and automated axe WCAG A/AA checks at desktop and mobile widths. Screenshots and failed-test traces are written to the ignored `test-results` directory. Automated checks complement manual visual and assistive-technology review; they are not a guarantee of complete accessibility.

## Content sources

Checked in the Church's Gospel Library on September 16, 2026:

- [Official hymnbook](https://www.churchofjesuschrist.org/study/manual/hymns?lang=eng) — hymn numbers and titles; Hymn 169 is “As Now We Take the Sacrament.”
- [General Handbook, chapter 29](https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng) — meeting order and fast and testimony meeting context.
- [John 13:34–35](https://www.churchofjesuschrist.org/study/scriptures/nt/john/13?lang=eng&id=p34-p35#p34) — sample topics about loving others.
- [Mosiah 2:17](https://www.churchofjesuschrist.org/study/scriptures/bofm/mosiah/2?lang=eng&id=p17#p17) — sample topics about service.