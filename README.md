# Bariga Ward · Sacrament Meetings
# Charles Ukoh 
# Wdd 430 WK02 Course Assignment

This is a Next.js App Router coursework project with typed, read-only sample meeting programmes, Gospel Library references, accessible navigation, and printable agendas.

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
| `/meetings?date=2026-05-03` | Filter the list by calendar date |
| `/meetings/[id]` | Full agenda with a Print programme button |
| `/meetings/current` | Redirect to the most recent Sunday's agenda, or `/meetings` if absent |
| `/api/meetings` | GET the collection |
| `/api/meetings?date=2026-05-03` | GET meetings for a valid ISO date |
| `/api/meetings/[id]` | GET one meeting; 400 for malformed IDs, 404 for missing IDs |

IDs are positive safe integers. Invalid date filters return HTTP 400; a valid date without a meeting returns an empty array. Mutation methods are intentionally omitted and return HTTP 405.

## Data and dates

- `lib/types.ts` defines the meeting, hymn, speaker, scripture reference, ward business, and API error types. Components and handlers have explicit types without `any`.
- `lib/meetings-db.ts` contains seven fictional agendas and exports `getMeetings`, `getMeetingById`, and `getCurrentMeeting`. Queries return copies so callers cannot accidentally alter the scaffold.
- `lib/ward.ts` configures my ward `Bariga Ward` and `Africa/Lagos`. The header and Sunday lookup use this time zone, including near-midnight requests.
- “This Sunday” means the Sunday on or before today's ward date, not the upcoming Sunday. September 16, 2026 therefore resolves to meeting 5 on September 13. Dates are fixed sample records; the redirect falls back to the list after an unrepresented week arrives.
- The nested layout supplies meetings navigation. `NavLinks` uses `usePathname` and `aria-current`; the section's current link points to the resolved detail page so its active state survives the redirect.

## Fetching the API from pages

Meeting pages call the API through `lib/meetings-api.ts`. They render dynamically, so a production build does not require a running copy of the API. Request-time fetches use `cache: "no-store"`.

Server-side fetches require an absolute URL. The default is `http://127.0.0.1:3000`, or the port in `PORT`. Set `MEETINGS_API_ORIGIN` to a trusted, reachable origin when deploying, especially on serverless hosting. The origin is never derived from a request's Host header.

For a different local port in PowerShell:

```powershell
$env:PORT = "3001"
$env:MEETINGS_API_ORIGIN = "http://127.0.0.1:3001"
npm run dev
```

If Next.js automatically chooses another port because 3000 is occupied, set these variables explicitly to the port you intend to use. A failed API request displays a retry action; malformed and absent meeting links display a not-found view. `app/meetings/loading.tsx` supplies the route-level loading state, which may be too brief to see with in-memory data.

# Vercel Deployment:
https://sacrament-meetings-h1c5p7xp6-emrys5.vercel.app/

## Quality checks

```sh
npm run lint
npm run typecheck
npm run build
npm test
```

I installed Playwright. So please build before running tests. Playwright launches a separate production server on port 3100 and shuts it down afterward; keep that port free.

Tests cover date boundaries, defensive data copies, collection filtering, 200/400/404/405 API responses, current-week navigation, active links, keyboard navigation, empty and not-found views, complete printable agendas, mobile overflow, and automated axe WCAG A/AA checks at desktop and mobile widths. Screenshots and failed-test traces are written to the ignored `test-results` directory. Automated checks complement manual visual and assistive-technology review; they are not a guarantee of complete accessibility.

## Content sources

Checked in the Church's Gospel Library on September 16, 2026:

- [Official hymnbook](https://www.churchofjesuschrist.org/study/manual/hymns?lang=eng) — hymn numbers and titles; Hymn 169 is “As Now We Take the Sacrament.”
- [General Handbook, chapter 29](https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng) — meeting order and fast and testimony meeting context.
- [John 13:34–35](https://www.churchofjesuschrist.org/study/scriptures/nt/john/13?lang=eng&id=p34-p35#p34) — sample topics about loving others.
- [Mosiah 2:17](https://www.churchofjesuschrist.org/study/scriptures/bofm/mosiah/2?lang=eng&id=p17#p17) — sample topics about service.
