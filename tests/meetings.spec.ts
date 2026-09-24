import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { countMeetings, getCurrentMeeting, getMeetingById, getMeetings } from "../lib/meetings-db";
import { getMostRecentSunday, getWardDate, isValidDate } from "../lib/dates";
import { getTotalPages, MEETINGS_PAGE_SIZE, parsePage } from "../lib/pagination";
import type { ApiError, SacramentMeeting } from "../lib/types";

// These tests read the seeded Neon database. IDs come from SERIAL, so look them up by date.
const REGULAR_DATE = "2026-02-08"; // speakers, a musical number and announcements
const TESTIMONY_DATE = "2026-01-04"; // testimony meeting with no ward business
const NO_ANNOUNCEMENTS_DATE = "2026-03-08";

// /meetings shows one page of cards, so a full list only fills the first page.
async function firstPageCount(): Promise<number> {
  return Math.min(await countMeetings(), MEETINGS_PAGE_SIZE);
}

async function meetingIdFor(date: string): Promise<number> {
  const [meeting] = await getMeetings({ date });
  if (!meeting) throw new Error(`The seed data has no meeting on ${date}.`);
  return meeting.id;
}

test("Sunday lookup respects the ward date, week and year boundaries, and missing records", async () => {
  expect(getMostRecentSunday(new Date("2026-09-16T12:00:00Z"))).toBe("2026-09-13");
  expect(getMostRecentSunday(new Date("2026-09-12T23:30:00Z"))).toBe("2026-09-13");
  expect(getMostRecentSunday(new Date("2026-09-12T22:30:00Z"))).toBe("2026-09-06");
  expect(getMostRecentSunday(new Date("2026-01-01T10:00:00Z"))).toBe("2025-12-28");
  expect((await getCurrentMeeting(new Date("2026-02-11T12:00:00Z")))?.date).toBe(REGULAR_DATE);
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

test("programme ordering puts the most recent past date before future dates", async () => {
  const dates = (await getMeetings({}, new Date("2026-02-11T12:00:00Z"))).map((meeting) => meeting.date);
  expect(dates).toEqual([
    "2026-02-08", "2026-02-01", "2026-01-25", "2026-01-18", "2026-01-11", "2026-01-04",
    "2026-02-15", "2026-02-22", "2026-03-01", "2026-03-08",
  ]);
  // Saturday UTC is already Sunday in Bariga; that programme now comes first.
  expect((await getMeetings({}, new Date("2026-02-14T23:30:00Z")))[0].date).toBe("2026-02-15");
  expect((await getMeetings({}, new Date("2026-01-01T12:00:00Z")))[0].date).toBe("2026-01-04");
  expect((await getMeetings({}, new Date("2030-01-01T12:00:00Z")))[0].date).toBe("2026-03-08");
});

test("search matches speakers, leaders and meeting type, and treats wildcards as text", async () => {
  const dates = async (query: string, date?: string): Promise<string[]> =>
    (await getMeetings({ query, date })).map((meeting) => meeting.date).sort();
  expect(await dates("favour")).toEqual(["2026-01-11"]); // speaker name, any case
  expect(await dates("Gimenez")).toEqual(["2026-01-25"]); // presiding leader
  expect(await dates("testimony")).toEqual(["2026-01-04", "2026-02-01", "2026-03-01"]);
  expect(await dates("Benjamin", "2026-03-08")).toEqual(["2026-03-08"]);
  expect(await dates("Benjamin", "2026-02-08")).toEqual([]);
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
    await expect(cards.filter({ hasText: "Upcoming" })).toHaveCount(meetings.filter((meeting) => meeting.date > getWardDate()).length);
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
  expect(searched.map((meeting) => meeting.date)).toEqual(["2026-01-25"]);
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
  await page.getByRole("link", { name: "View agenda for Sunday, 8 February 2026" }).click();
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

test("admin placeholder routes resolve alongside the public meeting routes", async ({ page }) => {
  await page.goto("/meetings/new");
  await expect(page.getByRole("heading", { level: 1, name: "Create Meeting — Coming in Week 04" })).toBeVisible();
  await page.goto(`/meetings/${await meetingIdFor(REGULAR_DATE)}/edit`);
  await expect(page.getByRole("heading", { level: 1, name: "Edit Meeting — Coming in Week 04" })).toBeVisible();
});

test("current route redirects to the most recent Sunday or the list", async ({ page }) => {
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
    for (const [name, path] of [["home", "/"], ["meetings", "/meetings"], ["agenda", `/meetings/${id}`], ["not-found", "/meetings/99999"], ["empty", "/meetings?date=2030-01-06"]]) {
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