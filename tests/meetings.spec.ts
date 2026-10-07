import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { addMeeting, countMeetings, deleteMeeting, getCurrentMeeting, getMeetingById, getMeetings } from "../lib/meetings-db";
import { formatMeetingDate, getThisSunday, getWardDate, isValidDate } from "../lib/dates";
import { getTotalPages, MEETINGS_PAGE_SIZE, parsePage } from "../lib/pagination";
import type { ApiError, SacramentMeeting } from "../lib/types";

// These tests read the seeded Neon database. IDs come from SERIAL, so look them up by date.
// The seed runs weekly from 4 October to 6 December 2026.
const REGULAR_DATE = "2026-11-08"; // speakers, a musical number and announcements
const TESTIMONY_DATE = "2026-10-04"; // testimony meeting with no ward business
const NO_ANNOUNCEMENTS_DATE = "2026-11-15";
// The ordering test adds its own upcoming meeting here and deletes it afterwards.
const ORDERING_TEST_DATE = "2099-12-13";
// Form tests create meetings on these far-future Sundays and always delete them afterwards.
const FORM_TEST_DATE = "2099-12-27";
const FORM_TEST_EDITED_DATE = "2099-12-20";

async function deleteFormTestMeetings(): Promise<void> {
  for (const date of [FORM_TEST_DATE, FORM_TEST_EDITED_DATE]) {
    for (const meeting of await getMeetings({ date })) await deleteMeeting(meeting.id);
  }
}

// /meetings shows one page of cards, so a full list only fills the first page.
async function firstPageCount(): Promise<number> {
  return Math.min(await countMeetings(), MEETINGS_PAGE_SIZE);
}

// The leader account comes from .env.local; create it with `npm run seed:user`.
async function signIn(page: Page): Promise<void> {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local.");
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/meetings$/);
}

async function meetingIdFor(date: string): Promise<number> {
  const [meeting] = await getMeetings({ date });
  if (!meeting) throw new Error(`The seed data has no meeting on ${date}.`);
  return meeting.id;
}

test("Sunday lookup respects the ward date, week and year boundaries, and missing records", async () => {
  // "This Sunday" is the Sunday ending the current week: the coming Sunday, or today on a Sunday.
  expect(getThisSunday(new Date("2026-09-16T12:00:00Z"))).toBe("2026-09-20"); // Wednesday
  expect(getThisSunday(new Date("2026-10-03T12:00:00Z"))).toBe("2026-10-04"); // Saturday
  expect(getThisSunday(new Date("2026-09-13T12:00:00Z"))).toBe("2026-09-13"); // Sunday itself
  // Bariga is UTC+1, so these UTC times fall on the other side of the ward's midnight.
  expect(getThisSunday(new Date("2026-09-12T23:30:00Z"))).toBe("2026-09-13"); // already Sunday in Bariga
  expect(getThisSunday(new Date("2026-09-13T22:30:00Z"))).toBe("2026-09-13"); // still Sunday in Bariga
  expect(getThisSunday(new Date("2026-09-13T23:30:00Z"))).toBe("2026-09-20"); // Monday in Bariga
  expect(getThisSunday(new Date("2026-12-30T10:00:00Z"))).toBe("2027-01-03"); // across the year end
  expect((await getCurrentMeeting(new Date("2026-11-04T12:00:00Z")))?.date).toBe(REGULAR_DATE);
  expect(await getCurrentMeeting(new Date("2030-01-01T12:00:00Z"))).toBeNull();
  expect(isValidDate("2026-02-30")).toBe(false);
  expect(isValidDate("2028-02-29")).toBe(true);
  expect(isValidDate("0000-01-01")).toBe(false); // Postgres has no year 0
  expect(await getMeetingById(2_147_483_648)).toBeNull(); // above the SERIAL range
});

test("changing a query result does not change later results", async () => {
  const copy = await getMeetings();
  copy[0].openingHymn.title = "Changed";
  expect((await getMeetingById(copy[0].id))?.openingHymn.title).not.toBe("Changed");
});

// The list order, worked out independently of the SQL: this Sunday, then upcoming (nearest first), then past (newest first).
function expectedOrder(dates: string[], now: Date): string[] {
  const today = getWardDate(now);
  const sunday = getThisSunday(now);
  const others = dates.filter((date) => date !== sunday);
  return [
    ...dates.filter((date) => date === sunday),
    ...others.filter((date) => date > today).sort(),
    ...others.filter((date) => date <= today).sort().reverse(),
  ];
}

test("programme ordering puts this Sunday first, then upcoming dates, then past dates", async () => {
  for (const meeting of await getMeetings({ date: ORDERING_TEST_DATE })) await deleteMeeting(meeting.id);
  const template = await getMeetingById(await meetingIdFor(REGULAR_DATE));
  if (!template) throw new Error("The seed data must include the regular meeting.");
  const fixture = await addMeeting({ ...template, date: ORDERING_TEST_DATE });
  try {
    const all = (await getMeetings()).map((meeting) => meeting.date);
    const wednesday = new Date("2026-11-11T12:00:00Z"); // this Sunday is 15 November
    const nows = [wednesday, new Date("2026-11-08T12:00:00Z"), new Date("2026-10-03T12:00:00Z"), new Date(), new Date("2030-01-01T12:00:00Z")];
    for (const now of nows) {
      const dates = (await getMeetings({}, now)).map((meeting) => meeting.date);
      expect(dates).toEqual(expectedOrder(all, now));
      // Upcoming meetings follow this Sunday directly, so the nearest ones are always on page 1.
      expect((await getMeetings({ page: 1 }, now)).map((meeting) => meeting.date)).toEqual(dates.slice(0, MEETINGS_PAGE_SIZE));
    }
    const dates = (await getMeetings({}, wednesday)).map((meeting) => meeting.date);
    expect(dates.slice(0, 2)).toEqual(["2026-11-15", "2026-11-22"]);
    expect(dates.indexOf(ORDERING_TEST_DATE)).toBeLessThan(dates.indexOf("2026-11-08")); // upcoming before past
    const first = async (now: string): Promise<string> => (await getMeetings({}, new Date(now)))[0].date;
    expect(await first("2026-11-08T12:00:00Z")).toBe("2026-11-08"); // on Sunday, today's meeting is this Sunday
    expect(await first("2026-10-03T12:00:00Z")).toBe("2026-10-04"); // on Saturday, tomorrow's meeting is this Sunday
    expect(await first("2026-11-14T23:30:00Z")).toBe("2026-11-15"); // Saturday UTC is already Sunday in Bariga
    expect(await first("2026-11-15T23:30:00Z")).toBe("2026-11-22"); // Sunday UTC is already Monday in Bariga
    expect(await first("2026-09-23T12:00:00Z")).toBe("2026-10-04"); // no meeting this Sunday: the next one leads
    expect(await first("2030-01-01T12:00:00Z")).toBe(ORDERING_TEST_DATE);
  } finally {
    await deleteMeeting(fixture.id);
  }
});

test("search matches speakers, leaders and meeting type, and treats wildcards as text", async () => {
  const dates = async (query: string, date?: string): Promise<string[]> =>
    (await getMeetings({ query, date })).map((meeting) => meeting.date).sort();
  expect(await dates("favour")).toEqual(["2026-10-11"]); // speaker name, any case
  expect(await dates("Gimenez")).toEqual(["2026-10-25"]); // presiding leader
  expect(await dates("testimony")).toEqual(["2026-10-04", "2026-11-01", "2026-12-06"]);
  expect(await dates("Benjamin", "2026-10-18")).toEqual(["2026-10-18"]);
  expect(await dates("Benjamin", REGULAR_DATE)).toEqual([]);
  expect(await dates("%")).toEqual([]);
  expect(await getMeetings({ query: "   " })).toHaveLength((await getMeetings()).length);
});

test("search box updates the URL after typing stops and Clear filter resets it", async ({ page }) => {
  const total = await firstPageCount();
  await page.goto("/meetings");
  const search = page.getByLabel("Search meetings");
  await search.fill("Gimenez");
  await expect(page).toHaveURL(/\/meetings\?page=1&query=Gimenez$/);
  await expect(page.locator(".meeting-card")).toHaveCount(1);
  await page.reload();
  await expect(search).toHaveValue("Gimenez");
  await search.fill("nobody-by-this-name");
  await expect(page.getByRole("heading", { name: "No meetings match your search" })).toBeVisible();
  await page.getByRole("link", { name: "Clear filter" }).click();
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(search).toHaveValue("");
  await expect(page.locator(".meeting-card")).toHaveCount(total);
});

test("pages split the ordered list and page numbers are clamped", async () => {
  const all = await getMeetings();
  const total = await countMeetings();
  expect(total).toBe(all.length);
  const totalPages = getTotalPages(total);
  const pages: SacramentMeeting[] = [];
  for (let number = 1; number <= totalPages; number += 1) {
    const results = await getMeetings({ page: number });
    expect(results.length).toBeLessThanOrEqual(MEETINGS_PAGE_SIZE);
    pages.push(...results);
  }
  expect(pages.map((meeting) => meeting.id)).toEqual(all.map((meeting) => meeting.id));
  expect(await countMeetings({ query: "Gimenez" })).toBe(1);
  expect(getTotalPages(0)).toBe(1);
  for (const value of [undefined, "", "abc", "0", "-1", "1.5", "1e2"]) expect(parsePage(value, 3)).toBe(1);
  expect(parsePage("2", 3)).toBe(2);
  expect(parsePage("99", 3)).toBe(3);
});

test("search and pagination live in the URL: no reload, reset to page 1, shareable, and Back works", async ({ page, context }) => {
  const query = "Onyemachi"; // the bishop presides over more than one page of meetings
  const matches = await countMeetings({ query });
  expect(getTotalPages(matches)).toBe(2);
  await page.goto("/meetings");
  // A full page load would drop this marker, so it shows navigation stayed client-side.
  await page.evaluate(() => { document.documentElement.dataset.sameDocument = "true"; });
  const search = page.getByLabel("Search meetings");
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  const cards = page.locator(".meeting-card");

  await search.fill(query);
  await expect(page).toHaveURL(new RegExp(`/meetings\\?page=1&query=${query}$`));
  await expect(pagination).toContainText("Page 1 of 2");
  await expect(cards).toHaveCount(MEETINGS_PAGE_SIZE);
  await expect(pagination.getByRole("link", { name: "Previous" })).toHaveCount(0);

  await pagination.getByRole("link", { name: "Next" }).click();
  await expect(page).toHaveURL(new RegExp(`/meetings\\?page=2&query=${query}$`));
  await expect(pagination).toContainText("Page 2 of 2");
  await expect(cards).toHaveCount(matches - MEETINGS_PAGE_SIZE);
  await expect(pagination.getByRole("link", { name: "Next" })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-same-document", "true");

  // A pasted link restores the same search and page in a new tab.
  const tab = await context.newPage();
  await tab.goto(page.url());
  await expect(tab.getByLabel("Search meetings")).toHaveValue(query);
  await expect(tab.getByRole("navigation", { name: "Pagination" })).toContainText("Page 2 of 2");
  const datesOf = (target: typeof page): Promise<(string | null)[]> =>
    target.locator(".meeting-card time").evaluateAll((elements) => elements.map((element) => element.getAttribute("datetime")));
  expect(await datesOf(tab)).toEqual(await datesOf(page));
  await tab.close();

  // A new search from page 2 starts again at page 1.
  await search.fill("Toluwalase");
  await expect(page).toHaveURL(/\/meetings\?page=1&query=Toluwalase$/);
  await expect(pagination).toContainText("Page 1 of 2");

  // Back steps through the previous searches and pages, and the input follows the URL.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/meetings\\?page=2&query=${query}$`));
  await expect(search).toHaveValue(query);
  await expect(pagination).toContainText("Page 2 of 2");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/meetings\\?page=1&query=${query}$`));
  await page.goBack();
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(search).toHaveValue("");
  await expect(page.locator("html")).toHaveAttribute("data-same-document", "true");

  // An out-of-range page shows the last real page.
  await page.goto(`/meetings?query=${query}&page=99`);
  await expect(pagination).toContainText("Page 2 of 2");
});

test("keyboard paging keeps focus on the results, and the summary announces each change", async ({ page }) => {
  await page.goto("/meetings");
  const summary = page.locator("#results-summary");
  await expect(summary).toHaveAttribute("role", "status");
  const total = await countMeetings();
  await expect(summary).toContainText(`${total} service programmes · Page 1 of ${getTotalPages(total)}`);

  // Next becomes a plain label on the last page; focus must not fall back to <body>.
  await page.getByRole("navigation", { name: "Pagination" }).getByRole("link", { name: "Next" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/page=2/);
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Page 2 of");
  const pagination = page.getByRole("navigation", { name: "Pagination" });
  await expect(pagination.getByRole("link", { name: "Next" })).toHaveCount(0);
  await expect(pagination).toContainText("(unavailable)"); // screen-reader-only text on the Next label

  // A search updates the same status element, and focus stays in the search box.
  const search = page.getByLabel("Search meetings");
  await search.fill("Gimenez");
  await expect(summary).toContainText("1 service programme matching “Gimenez”");
  await expect(search).toBeFocused();
  await search.fill("nobody-by-this-name");
  await expect(summary).toContainText("0 service programmes matching “nobody-by-this-name”");
});

test("the loading skeleton shows while a new search or page loads", async ({ page }) => {
  await page.goto("/meetings");
  // The skeleton can be brief, so record whether it ever enters the page.
  await page.evaluate(() => {
    new MutationObserver(() => {
      if (document.body.textContent?.includes("Loading meeting programme")) document.documentElement.dataset.sawSkeleton = "true";
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await page.getByLabel("Search meetings").fill("Onyemachi");
  await expect(page.locator(".meeting-card")).toHaveCount(MEETINGS_PAGE_SIZE);
  await expect(page.locator("html")).toHaveAttribute("data-saw-skeleton", "true");
});

test("programme ordering reads left to right on desktop and tablet, top to bottom on mobile", async ({ page }) => {
  const meetings = await getMeetings({ page: 1 });
  const expectedDates = meetings.map((meeting) => meeting.date);
  for (const width of [1440, 900, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/meetings");
    const cards = page.locator(".meeting-card");
    await expect(cards).toHaveCount(meetings.length);
    expect(await cards.locator("time").evaluateAll((elements) => elements.map((element) => element.getAttribute("datetime")))).toEqual(expectedDates);
    // This Sunday's card is tagged "This Sunday" only; later dates are "Upcoming".
    const sunday = getThisSunday();
    await expect(cards.filter({ hasText: "This Sunday" })).toHaveCount(meetings.filter((meeting) => meeting.date === sunday).length);
    await expect(cards.filter({ hasText: "Upcoming" })).toHaveCount(meetings.filter((meeting) => meeting.date !== sunday && meeting.date > getWardDate()).length);
    if (meetings.some((meeting) => meeting.date === sunday)) await expect(cards.first()).toContainText("This Sunday");
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    if (!first || !second) throw new Error("Programme cards must be visible.");
    if (width >= 768) {
      expect(first.x).toBeLessThan(second.x);
      expect(first.y).toBe(second.y);
    } else {
      expect(first.y).toBeLessThan(second.y);
    }
  }
});

test("collection API returns typed records and filters by date", async ({ request }) => {
  const response = await request.get("/api/meetings");
  expect(response.status()).toBe(200);
  const meetings: SacramentMeeting[] = await response.json();
  expect(meetings.length).toBeGreaterThanOrEqual(5);
  expect(new Set(meetings.map((meeting) => meeting.id)).size).toBe(meetings.length);
  const filtered = await request.get(`/api/meetings?date=${TESTIMONY_DATE}`);
  expect(filtered.status()).toBe(200);
  const result: SacramentMeeting[] = await filtered.json();
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(await meetingIdFor(TESTIMONY_DATE));
  expect(result[0].date).toBe(TESTIMONY_DATE);
  expect(await (await request.get("/api/meetings?date=2030-01-06")).json()).toEqual([]);
  const searched: SacramentMeeting[] = await (await request.get("/api/meetings?query=Gimenez")).json();
  expect(searched.map((meeting) => meeting.date)).toEqual(["2026-10-25"]);
  for (const date of ["", "not-a-date", "2026-02-30", "2026-5-3", "0000-01-01"]) {
    expect((await request.get(`/api/meetings?date=${date}`)).status()).toBe(400);
  }
});

test("item API distinguishes found, malformed, missing, and unsupported requests", async ({ request }) => {
  const id = await meetingIdFor(REGULAR_DATE);
  const response = await request.get(`/api/meetings/${id}`);
  expect(response.status()).toBe(200);
  const meeting: SacramentMeeting = await response.json();
  expect(meeting.id).toBe(id);
  expect(meeting.date).toBe(REGULAR_DATE);
  expect(meeting.speakers.some((item) => item.type === "musical-number")).toBe(true);
  for (const id of ["abc", "1abc", "1.5", "1e2", "-1", "0", "9007199254740992"]) {
    const invalid = await request.get(`/api/meetings/${id}`);
    expect(invalid.status()).toBe(400);
    const error: ApiError = await invalid.json();
    expect(error.error).toBeTruthy();
  }
  expect((await request.get("/api/meetings/999999")).status()).toBe(404);
  const outOfRange = await request.get("/api/meetings/2147483648");
  expect(outOfRange.status()).toBe(404);
  expect((await outOfRange.json() as ApiError).error).toBeTruthy();
  expect((await request.post("/api/meetings")).status()).toBe(405);
});

test("the agenda view fetches from the browser's deployment origin with its session", async ({ page, context, baseURL }) => {
  if (!baseURL) throw new Error("A test deployment URL is required.");
  await context.addCookies([{ name: "test-preview-session", value: "local-test-session", url: baseURL, httpOnly: true }]);
  const id = await meetingIdFor(REGULAR_DATE);
  const apiRequest = page.waitForRequest((request) => new URL(request.url()).pathname === `/api/meetings/${id}`);
  await page.goto(`/meetings/${id}`);
  const request = await apiRequest;
  expect(new URL(request.url()).origin).toBe(baseURL);
  expect((await request.allHeaders()).cookie).toContain("test-preview-session=local-test-session");
  await expect(page.getByRole("button", { name: "Print programme" })).toBeVisible();
});

test("the agenda view shows loading and can retry a failed API request", async ({ page }) => {
  const id = await meetingIdFor(REGULAR_DATE);
  let releaseRequest: () => void = () => {};
  const released = new Promise<void>((resolve) => { releaseRequest = resolve; });
  await page.route(`**/api/meetings/${id}`, async (route) => {
    await released;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Temporary test failure" }) });
  }, { times: 1 });
  await page.goto(`/meetings/${id}`);
  await expect(page.getByRole("status")).toContainText("Loading meeting programme");
  releaseRequest();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Unable to load the programme");
  await page.getByRole("button", { name: "Please try again" }).click();
  await expect(page.getByRole("button", { name: "Print programme" })).toBeVisible();
});

test("internal navigation, keyboard skip link and active states work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Bariga Ward home" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Meetings", exact: true }).click();
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(page.getByRole("heading", { name: "Meeting programmes" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Meetings", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  await expect(page.getByRole("navigation", { name: "Meetings navigation" }).getByRole("link", { name: "All meetings" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: `View agenda for ${formatMeetingDate(REGULAR_DATE)}` }).click();
  await expect(page.getByRole("heading", { name: "Sacrament meeting", exact: true })).toBeVisible();
  await expect(page.getByText("Following the Saviour through service")).toBeVisible();
  await expect(page.getByText("Musical number", { exact: true })).toBeVisible();
});

test("date filter, empty result, invalid date and unavailable meeting states", async ({ page }) => {
  const total = await firstPageCount();
  await page.goto("/meetings");
  await page.getByLabel("Find a meeting by date").fill(TESTIMONY_DATE);
  await page.getByRole("button", { name: "Find meeting" }).click();
  await expect(page.locator(".meeting-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Clear filter" }).click();
  await expect(page.locator(".meeting-card")).toHaveCount(total);
  await page.goto("/meetings?date=2030-01-06");
  await expect(page.getByRole("heading", { name: "No meeting scheduled for this date" })).toBeVisible();
  await page.goto("/meetings?date=2026-02-30");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("valid date");
  for (const id of ["abc", "99999"]) {
    await page.goto(`/meetings/${id}`);
    await expect(page.getByRole("heading", { name: "Meeting not found" })).toBeVisible();
  }
  await page.goto(`/meetings/${await meetingIdFor(TESTIMONY_DATE)}`);
  await expect(page.getByRole("heading", { name: "Bearing testimony" })).toBeVisible();
  await expect(page.getByText("No ward business scheduled.")).toBeVisible();
  await page.goto(`/meetings/${await meetingIdFor(NO_ANNOUNCEMENTS_DATE)}`);
  await expect(page.getByText("No announcements for this meeting.")).toBeVisible();
});

test("leader pages redirect to sign in, and sign in and sign out complete the round trip", async ({ page }) => {
  const id = await meetingIdFor(REGULAR_DATE);
  // Signed out: no leader controls, and each leader page redirects to /login.
  await page.goto("/meetings");
  await expect(page.getByRole("link", { name: "New meeting" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Edit meeting on/ })).toHaveCount(0);
  for (const path of ["/meetings/new", `/meetings/${id}/edit`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  }

  // A wrong password stays on the form with an error.
  await page.getByLabel("Email").fill(process.env.ADMIN_EMAIL ?? "");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("The email or password is not correct.");

  // The email survives the failed attempt, and the right password returns to the page that was asked for.
  await expect(page.getByLabel("Email")).toHaveValue(process.env.ADMIN_EMAIL ?? "");
  await page.getByLabel("Password").fill(process.env.ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/meetings/${id}/edit$`));
  await expect(page.getByRole("heading", { level: 1, name: "Edit meeting" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  // Signed-in leaders who open /login go to the list, which now shows the controls.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/meetings$/);
  await expect(page.getByRole("link", { name: "New meeting" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Leader sign in" })).toBeVisible();
  await page.goto("/meetings/new");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

test("pages publish a title, description and Open Graph image", async ({ page, request }) => {
  const id = await meetingIdFor(REGULAR_DATE);
  await page.goto("/");
  await expect(page).toHaveTitle("Bariga Ward | Sacrament Meetings");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /sacrament meeting programmes/);
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImage).toContain("/opengraph-image");
  const image = await request.get(new URL(ogImage ?? "").pathname);
  expect(image.status()).toBe(200);
  expect(image.headers()["content-type"]).toBe("image/png");

  await page.goto("/meetings");
  await expect(page).toHaveTitle("Meetings | Bariga Ward");
  await page.goto(`/meetings/${id}`);
  await expect(page).toHaveTitle(`Sacrament meeting, ${formatMeetingDate(REGULAR_DATE)} | Bariga Ward`);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", new RegExp(`^Order of service for ${formatMeetingDate(REGULAR_DATE)}`));
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
});

test.describe("leader forms", () => {
  test.beforeAll(deleteFormTestMeetings);
  test.afterAll(deleteFormTestMeetings);
  test.beforeEach(async ({ page }) => signIn(page));

  test("create form validates on the server, announces field errors, and keeps what was typed", async ({ page }) => {
    await page.goto("/meetings");
    await page.getByRole("link", { name: "New meeting" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Create meeting" })).toBeVisible();

    await page.getByRole("button", { name: "Create meeting" }).click();
    await expect(page.getByText(/The meeting was not saved\. Fix the \d+ fields marked below/)).toBeVisible();
    const date = page.getByLabel("Date", { exact: true });
    // Focus moves to the first invalid field, which points at its live error container.
    await expect(date).toBeFocused();
    await expect(date).toHaveAttribute("aria-invalid", "true");
    await expect(date).toHaveAttribute("aria-describedby", "date-hint date-error");
    await expect(page.locator("#date-error")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#date-error")).toContainText("Enter the meeting date.");
    await expect(page.locator("#presiding-error")).toContainText("Enter who is presiding.");
    await expect(page.locator("#openingHymnNumber-error")).toHaveText("Error: Enter the opening hymn number.");

    await date.fill("2099-12-21"); // a Monday
    await page.getByLabel("Presiding").fill("Bishop Test");
    await page.getByLabel("Opening hymn number").fill("0");
    await page.getByRole("button", { name: "Add speaker" }).click();
    await expect(page.getByLabel("Name")).toBeFocused();
    await page.getByLabel("Name").fill("Sister Test");
    await page.getByRole("button", { name: "Create meeting" }).click();
    await expect(page.locator("#date-error")).toContainText("Choose a Sunday.");
    await expect(page.locator("#openingHymnNumber-error")).toContainText("whole number from 1 to 9999");
    await expect(page.getByRole("group", { name: "Programme item 1" }).getByText("Enter the speaker's topic.")).toBeVisible();
    // Fixed fields lose their errors, and typed values survive the round trip.
    await expect(page.locator("#presiding-error")).toBeEmpty();
    await expect(page.getByLabel("Presiding")).not.toHaveAttribute("aria-invalid");
    await expect(page.getByLabel("Presiding")).toHaveValue("Bishop Test");
    await expect(page.getByLabel("Name")).toHaveValue("Sister Test");

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations, JSON.stringify(results.violations)).toEqual([]);

    await date.fill(FORM_TEST_DATE);
    await page.getByLabel("Meeting type").selectOption("regular");
    await page.getByLabel("Conducting").fill("Brother Test");
    await page.getByLabel("Opening hymn number").fill("2");
    await page.getByLabel("Opening hymn title").fill("The Spirit of God");
    await page.getByLabel("Opening prayer").fill("Sister Opening");
    await page.getByLabel("Ward business").fill("Sustaining a test teacher\n\n");
    await page.getByLabel("Sacrament hymn number").fill("169");
    await page.getByLabel("Sacrament hymn title").fill("As Now We Take the Sacrament");
    await page.getByLabel("Topic or selection").fill("Testing with faith");
    await page.getByLabel("Closing hymn number").fill("152");
    await page.getByLabel("Closing hymn title").fill("God Be with You Till We Meet Again");
    await page.getByLabel("Closing prayer").fill("Brother Closing");
    await page.getByLabel("Announcements").fill("First test announcement\nSecond test announcement");
    await page.getByRole("button", { name: "Create meeting" }).click();

    await expect(page).toHaveURL(/\/meetings$/);
    const [created] = await getMeetings({ date: FORM_TEST_DATE });
    expect(created).toMatchObject({
      meetingType: "regular", presiding: "Bishop Test", conducting: "Brother Test",
      openingHymn: { number: 2, title: "The Spirit of God" },
      wardBusiness: [{ description: "Sustaining a test teacher" }],
      speakers: [{ type: "speaker", name: "Sister Test", topic: "Testing with faith" }],
      announcements: ["First test announcement", "Second test announcement"],
    });
    await page.goto(`/meetings?date=${FORM_TEST_DATE}`);
    await expect(page.locator(".meeting-card")).toHaveCount(1);
  });

  test("a second meeting on the same Sunday is rejected with a field error", async ({ page }) => {
    const [existing] = await getMeetings({ date: FORM_TEST_DATE });
    if (!existing) throw new Error("The create test must run first.");
    const regularId = await meetingIdFor(REGULAR_DATE);
    await page.goto(`/meetings/${regularId}/edit`);
    await page.getByLabel("Date", { exact: true }).fill(FORM_TEST_DATE);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("#date-error")).toContainText("A meeting already exists on this date.");
    expect((await getMeetingById(regularId))?.date).toBe(REGULAR_DATE);
  });

  test("edit form loads the saved meeting, keeps references, and the list shows the change", async ({ page }) => {
    const [meeting] = await getMeetings({ date: FORM_TEST_DATE });
    if (!meeting) throw new Error("The create test must run first.");
    await page.goto(`/meetings?date=${FORM_TEST_DATE}`);
    await page.getByRole("link", { name: /^Edit meeting on/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Edit meeting" })).toBeVisible();
    await expect(page.getByLabel("Presiding")).toHaveValue("Bishop Test");

    await page.getByLabel("Conducting").fill("");
    await page.getByLabel("Reference link").fill("javascript:alert(1)");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator("#conducting-error")).toContainText("Enter who is conducting.");
    await expect(page.getByText("Enter a full link that starts with https://.")).toBeVisible();
    await expect(page.getByText("Enter a title for this link.")).toBeVisible();

    await page.getByLabel("Date", { exact: true }).fill(FORM_TEST_EDITED_DATE);
    await page.getByLabel("Conducting").fill("Sister Edited");
    await page.getByLabel("Reference title").fill("Mosiah 2:17");
    await page.getByLabel("Reference link").fill("https://www.churchofjesuschrist.org/study/scriptures/bofm/mosiah/2?lang=eng&id=p17#p17");
    await page.getByRole("button", { name: "Add musical number" }).click();
    await page.getByRole("group", { name: "Programme item 2" }).getByLabel("Name").fill("Test Choir");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(/\/meetings$/);
    expect(await getMeetingById(meeting.id)).toMatchObject({
      date: FORM_TEST_EDITED_DATE, conducting: "Sister Edited",
      speakers: [
        { name: "Sister Test", reference: { title: "Mosiah 2:17" } },
        { type: "musical-number", name: "Test Choir", topic: "" },
      ],
    });
    await page.goto(`/meetings?date=${FORM_TEST_EDITED_DATE}`);
    await expect(page.locator(".meeting-card")).toContainText("Conducting · Sister Edited");
  });

  test("delete asks for confirmation and removes the card without leaving the list", async ({ page }) => {
    await page.goto(`/meetings?date=${FORM_TEST_EDITED_DATE}`);
    const deleteButton = page.getByRole("button", { name: /^Delete meeting on/ });
    page.once("dialog", (dialog) => dialog.dismiss());
    await deleteButton.click();
    await expect(page.locator(".meeting-card")).toHaveCount(1);

    page.once("dialog", (dialog) => dialog.accept());
    await deleteButton.click();
    await expect(page.getByRole("heading", { name: "No meeting scheduled for this date" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/meetings\\?date=${FORM_TEST_EDITED_DATE}$`));
    await expect(page.locator("#results-summary")).toBeFocused();
    expect(await getMeetings({ date: FORM_TEST_EDITED_DATE })).toEqual([]);
  });

  test("editing a missing meeting shows the not-found page", async ({ page }) => {
    for (const id of ["99999", "abc"]) {
      await page.goto(`/meetings/${id}/edit`);
      await expect(page.getByRole("heading", { level: 1, name: "Meeting not found" })).toBeVisible();
      await page.getByRole("link", { name: "Back to all meetings" }).click();
      await expect(page).toHaveURL(/\/meetings$/);
    }
  });
});

test("current route redirects to this Sunday or the list", async ({ page }) => {
  const current = await getCurrentMeeting();
  await page.goto("/meetings/current");
  await expect(page).toHaveURL(new RegExp(`${current ? `/meetings/${current.id}` : "/meetings"}$`));
  if (current) await expect(page.getByRole("navigation", { name: "Meetings navigation" }).getByRole("link", { name: "This Sunday" })).toHaveAttribute("aria-current", "page");
});

test("print control invokes printing and preserves the complete agenda on paper", async ({ page }, testInfo) => {
  const id = await meetingIdFor(REGULAR_DATE);
  await page.goto(`/meetings/${id}`);
  await page.evaluate(() => { window.print = (): void => { document.documentElement.dataset.printInvoked = "true"; }; });
  await page.getByRole("button", { name: "Print programme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-print-invoked", "true");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.getByRole("button", { name: "Print programme" })).toBeHidden();
  for (const heading of ["Welcome & opening", "The sacrament", "Messages & music", "Closing", "Ward announcements"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText(`Bariga Ward · Programme ${id}`)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("programme-print.png"), fullPage: true });
});

for (const width of [1440, 390]) {
  test(`pages have no detected WCAG A/AA violations or horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const id = await meetingIdFor(REGULAR_DATE);
    const total = await firstPageCount();
    // Signed-out pages come first; the leader pages after "login" need a session.
    for (const [name, path] of [["home", "/"], ["meetings", "/meetings"], ["agenda", `/meetings/${id}`], ["not-found", "/meetings/99999"], ["empty", "/meetings?date=2030-01-06"], ["login", "/login"], ["create", "/meetings/new"], ["edit", `/meetings/${id}/edit`], ["edit-not-found", "/meetings/99999/edit"]]) {
      if (name === "create") await signIn(page);
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      if (name === "meetings") await expect(page.locator(".meeting-card")).toHaveCount(total);
      if (name === "empty") await expect(page.getByRole("heading", { name: "No meeting scheduled for this date" })).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${name}: ${JSON.stringify(results.violations)}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (["home", "meetings", "agenda"].includes(name)) await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
    }
  });
}