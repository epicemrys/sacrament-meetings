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
| `/meetings` | Current and past programmes, newest first, followed by upcoming programmes, nearest date first |
| `/meetings?date=2026-01-04` | Filter the list by calendar date |
| `/meetings?query=Gimenez` | Search by speaker, presiding or conducting leader, or meeting type |
| `/meetings/[id]` | Full agenda with a Print programme button |
| `/meetings/current` | Redirect to the most recent Sunday's agenda, or `/meetings` if absent |
| `/meetings/new` | Leader placeholder for the create form (Week 04) |
| `/meetings/[id]/edit` | Leader placeholder for the edit form (Week 04) |
| `/api/meetings` | GET the collection |
| `/api/meetings?date=2026-01-04` | GET meetings for a valid ISO date |
| `/api/meetings/[id]` | GET one meeting; 400 for malformed IDs, 404 for missing IDs |

## Data and dates

- `lib/types.ts` defines the meeting, hymn, speaker, scripture reference, ward business, and API error types. Components and handlers have explicit types without `any`.
- `lib/meetings-db.ts` reads the `meetings` table in Neon Postgres through `neon()` tagged templates, so every value is parameterized. It exports async `getMeetings` (filters by `date` and `query`, and by `page` when given), `countMeetings`, `getMeetingById`, and `getCurrentMeeting`. `addMeeting`, `updateMeeting`, and `deleteMeeting` are stubs until the Week 04 forms. The connection string comes from `POSTGRES_URL` in `.env.local`.
- `lib/ward.ts` configures my ward `Bariga Ward` and `Africa/Lagos`. The header and Sunday lookup use this time zone, including near-midnight requests.
- “This Sunday” means the Sunday on or before today's ward date, not the upcoming Sunday. February 11, 2026 therefore resolves to the meeting on February 8. The seed covers January 4 to March 8, 2026; the redirect falls back to the list for any week without a meeting.
- The nested layout supplies meetings navigation. `NavLinks` uses `usePathname` and `aria-current`; the section's current link points to the resolved detail page so its active state survives the redirect.

## How pages get their data

The meetings list is a Server Component: it reads `date` and `query` from `searchParams` and calls `getMeetings()` directly. `components/MeetingSearch.tsx` writes `?query=` to the URL with `router.push`, debounced by 300 ms through `use-debounce`, so typing doesn't query the database on every keystroke. Each search resets to `?page=1` and adds one history entry, so Back returns to the previous search. The input uses `defaultValue`, so the URL stays the source of truth and a refresh or shared link keeps the search.

`components/Pagination.tsx` reads `?page=` and renders Previous and Next links that keep `query` and `date`. The list shows six meetings per page (`MEETINGS_PAGE_SIZE` in `lib/pagination.ts`). The page counts matches first, so an out-of-range page number shows the last real page.

The agenda page renders through the typed Client Component in `components/MeetingApiViews.tsx`. After hydration, it calls `/api/meetings/[id]` through `lib/meetings-api.ts`, using `cache: "no-store"` and same-origin credentials. The API handlers remain server-side and query the database through `lib/meetings-db.ts`.

Relative browser URLs automatically follow the current domain and port, including each Vercel branch preview, and include the visitor's session cookies on protected previews. There is no server-side call to `127.0.0.1:3000`, and no `MEETINGS_API_ORIGIN` environment variable is required or used. An old value for that variable can be removed from Vercel settings.

# Vercel Deployment:
https://sacrament-meetings-blond.vercel.app

## Quality checks

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

I installed Playwright. So please build before running tests. Playwright launches a separate production server on port 3100 and shuts it down afterward; keep that port free.

Tests cover date boundaries, search, pagination, URL state (reload, new tab, Back), focus after paging, screen-reader status updates, loading skeletons, collection filtering, 200/400/404/405 API responses, current-week navigation, active links, keyboard navigation, empty and not-found views, complete printable agendas, mobile overflow, and automated axe WCAG A/AA checks at desktop and mobile widths. Screenshots and failed-test traces are written to the ignored `test-results` directory. Automated checks complement manual visual and assistive-technology review; they are not a guarantee of complete accessibility.

## Content sources

Checked in the Church's Gospel Library on September 16, 2026:

- [Official hymnbook](https://www.churchofjesuschrist.org/study/manual/hymns?lang=eng) — hymn numbers and titles; Hymn 169 is “As Now We Take the Sacrament.”
- [General Handbook, chapter 29](https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng) — meeting order and fast and testimony meeting context.
- [John 13:34–35](https://www.churchofjesuschrist.org/study/scriptures/nt/john/13?lang=eng&id=p34-p35#p34) — sample topics about loving others.
- [Mosiah 2:17](https://www.churchofjesuschrist.org/study/scriptures/bofm/mosiah/2?lang=eng&id=p17#p17) — sample topics about service.