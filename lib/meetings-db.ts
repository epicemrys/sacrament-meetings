import { getThisSunday, getWardDate } from "./dates";
import { sql } from "./db";
import { MEETINGS_PAGE_SIZE } from "./pagination";
import type { GospelReference, Hymn, SacramentMeeting, SpeakerItem, WardBusinessItem } from "./types";

// Static links for the home page; these are not stored in the database.
export const gospelSources: GospelReference[] = [
  { title: "Hymns of The Church of Jesus Christ of Latter-day Saints", url: "https://www.churchofjesuschrist.org/study/manual/hymns?lang=eng" },
  { title: "General Handbook, chapter 29: Meetings in the Church", url: "https://www.churchofjesuschrist.org/study/manual/general-handbook/29-meetings-in-the-church?lang=eng" },
  { title: "John 13:34–35 · Loving one another", url: "https://www.churchofjesuschrist.org/study/scriptures/nt/john/13?lang=eng&id=p34-p35#p34" },
  { title: "Mosiah 2:17 · Serving others", url: "https://www.churchofjesuschrist.org/study/scriptures/bofm/mosiah/2?lang=eng&id=p17#p17" },
];

interface MeetingRow {
  id: number;
  date: string;
  meeting_type: SacramentMeeting["meetingType"];
  presiding: string;
  conducting: string;
  announcements: string[] | null;
  opening_hymn: Hymn;
  opening_prayer: string;
  ward_business: WardBusinessItem[] | null;
  stake_business: boolean | null;
  sacrament_hymn: Hymn;
  speakers: SpeakerItem[] | null;
  closing_hymn: Hymn;
  closing_prayer: string;
}

function toMeeting(row: MeetingRow): SacramentMeeting {
  return {
    id: row.id,
    date: row.date,
    meetingType: row.meeting_type,
    presiding: row.presiding,
    conducting: row.conducting,
    announcements: row.announcements ?? [],
    openingHymn: row.opening_hymn,
    openingPrayer: row.opening_prayer,
    wardBusiness: row.ward_business ?? [],
    stakeBusiness: row.stake_business ?? false,
    sacramentHymn: row.sacrament_hymn,
    speakers: row.speakers ?? [],
    closingHymn: row.closing_hymn,
    closingPrayer: row.closing_prayer,
  };
}

export interface MeetingFilters {
  date?: string | null;
  query?: string | null;
}

function likePattern(query: string | null | undefined): string | null {
  const term = query?.trim();
  return term ? `%${term.replace(/[\\%_]/g, "\\$&")}%` : null;
}

export async function getMeetings(
  { date, query, page }: MeetingFilters & { page?: number } = {},
  now: Date = new Date(),
): Promise<SacramentMeeting[]> {
  const today = getWardDate(now);
  const sunday = getThisSunday(now);
  const pattern = likePattern(query);
  const limit = page ? MEETINGS_PAGE_SIZE : null;
  const offset = page ? (page - 1) * MEETINGS_PAGE_SIZE : 0;
  const rows = await sql()`
    SELECT id, date::text AS date, meeting_type, presiding, conducting, announcements,
           opening_hymn, opening_prayer, ward_business, stake_business,
           sacrament_hymn, speakers, closing_hymn, closing_prayer
    FROM meetings
    WHERE (${date ?? null}::date IS NULL OR date = ${date ?? null}::date)
      AND (${pattern}::text IS NULL
           OR presiding ILIKE ${pattern}
           OR conducting ILIKE ${pattern}
           OR meeting_type ILIKE ${pattern}
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(speakers) AS s WHERE s->>'name' ILIKE ${pattern}))
    -- This Sunday first, then upcoming meetings (nearest first), then past meetings (newest first).
    ORDER BY CASE WHEN date = ${sunday}::date THEN 0 WHEN date > ${today}::date THEN 1 ELSE 2 END,
             CASE WHEN date > ${today}::date THEN date END ASC,
             date DESC
    LIMIT ${limit}::int OFFSET ${offset}::int`;
  return (rows as MeetingRow[]).map(toMeeting);
}

export async function countMeetings({ date, query }: MeetingFilters = {}): Promise<number> {
  const pattern = likePattern(query);
  const rows = await sql()`
    SELECT COUNT(*)::int AS total
    FROM meetings
    WHERE (${date ?? null}::date IS NULL OR date = ${date ?? null}::date)
      AND (${pattern}::text IS NULL
           OR presiding ILIKE ${pattern}
           OR conducting ILIKE ${pattern}
           OR meeting_type ILIKE ${pattern}
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(speakers) AS s WHERE s->>'name' ILIKE ${pattern}))`;
  const [row] = rows as { total: number }[];
  return row?.total ?? 0;
}

// The id column is SERIAL (a 32-bit integer); larger IDs can't exist and would make Postgres throw.
const MAX_MEETING_ID = 2_147_483_647;

export async function getMeetingById(id: number): Promise<SacramentMeeting | null> {
  if (id > MAX_MEETING_ID) return null;
  const rows = await sql()`
    SELECT id, date::text AS date, meeting_type, presiding, conducting, announcements,
           opening_hymn, opening_prayer, ward_business, stake_business,
           sacrament_hymn, speakers, closing_hymn, closing_prayer
    FROM meetings
    WHERE id = ${id}`;
  const [row] = rows as MeetingRow[];
  return row ? toMeeting(row) : null;
}

export async function getCurrentMeeting(now: Date = new Date()): Promise<SacramentMeeting | null> {
  return (await getMeetings({ date: getThisSunday(now) }, now))[0] ?? null;
}

// The date column is UNIQUE, so a second programme for the same Sunday is rejected.
export class MeetingDateTakenError extends Error {
  constructor(date: string) {
    super(`A meeting already exists on ${date}.`);
    this.name = "MeetingDateTakenError";
  }
}

function isDateTaken(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "23505"
    && "constraint" in error && error.constraint === "meetings_date_key";
}

// JSONB values are sent as JSON text; undefined becomes NULL so COALESCE keeps the stored value.
function json(value: unknown): string | null {
  return value === undefined ? null : JSON.stringify(value);
}

export async function addMeeting(meeting: Omit<SacramentMeeting, "id">): Promise<SacramentMeeting> {
  try {
    const rows = await sql()`
      INSERT INTO meetings (date, meeting_type, presiding, conducting, announcements,
                            opening_hymn, opening_prayer, ward_business, stake_business,
                            sacrament_hymn, speakers, closing_hymn, closing_prayer)
      VALUES (${meeting.date}::date, ${meeting.meetingType}, ${meeting.presiding}, ${meeting.conducting},
              ${meeting.announcements ?? []}::text[], ${json(meeting.openingHymn)}::jsonb, ${meeting.openingPrayer},
              ${json(meeting.wardBusiness)}::jsonb, ${meeting.stakeBusiness}, ${json(meeting.sacramentHymn)}::jsonb,
              ${json(meeting.speakers)}::jsonb, ${json(meeting.closingHymn)}::jsonb, ${meeting.closingPrayer})
      RETURNING id, date::text AS date, meeting_type, presiding, conducting, announcements,
                opening_hymn, opening_prayer, ward_business, stake_business,
                sacrament_hymn, speakers, closing_hymn, closing_prayer`;
    const [row] = rows as MeetingRow[];
    if (!row) throw new Error("The database did not return the new meeting.");
    return toMeeting(row);
  } catch (error) {
    if (isDateTaken(error)) throw new MeetingDateTakenError(meeting.date);
    throw error;
  }
}

// Fields left out of `changes` keep their stored values.
export async function updateMeeting(id: number, changes: Partial<Omit<SacramentMeeting, "id">>): Promise<SacramentMeeting | null> {
  if (id > MAX_MEETING_ID) return null;
  try {
    const rows = await sql()`
      UPDATE meetings SET
        date = COALESCE(${changes.date ?? null}::date, date),
        meeting_type = COALESCE(${changes.meetingType ?? null}::text, meeting_type),
        presiding = COALESCE(${changes.presiding ?? null}::text, presiding),
        conducting = COALESCE(${changes.conducting ?? null}::text, conducting),
        announcements = COALESCE(${changes.announcements ?? null}::text[], announcements),
        opening_hymn = COALESCE(${json(changes.openingHymn)}::jsonb, opening_hymn),
        opening_prayer = COALESCE(${changes.openingPrayer ?? null}::text, opening_prayer),
        ward_business = COALESCE(${json(changes.wardBusiness)}::jsonb, ward_business),
        stake_business = COALESCE(${changes.stakeBusiness ?? null}::boolean, stake_business),
        sacrament_hymn = COALESCE(${json(changes.sacramentHymn)}::jsonb, sacrament_hymn),
        speakers = COALESCE(${json(changes.speakers)}::jsonb, speakers),
        closing_hymn = COALESCE(${json(changes.closingHymn)}::jsonb, closing_hymn),
        closing_prayer = COALESCE(${changes.closingPrayer ?? null}::text, closing_prayer)
      WHERE id = ${id}
      RETURNING id, date::text AS date, meeting_type, presiding, conducting, announcements,
                opening_hymn, opening_prayer, ward_business, stake_business,
                sacrament_hymn, speakers, closing_hymn, closing_prayer`;
    const [row] = rows as MeetingRow[];
    return row ? toMeeting(row) : null;
  } catch (error) {
    if (isDateTaken(error) && changes.date) throw new MeetingDateTakenError(changes.date);
    throw error;
  }
}

export async function deleteMeeting(id: number): Promise<boolean> {
  if (id > MAX_MEETING_ID) return false;
  const rows = await sql()`DELETE FROM meetings WHERE id = ${id} RETURNING id`;
  return (rows as { id: number }[]).length > 0;
}