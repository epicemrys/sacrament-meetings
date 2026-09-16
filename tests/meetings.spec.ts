import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getCurrentMeeting, getMeetingById, getMeetings } from "../lib/meetings-db";
import { getMostRecentSunday, getWardDate, isValidDate } from "../lib/dates";
import type { ApiError, SacramentMeeting } from "../lib/types";

test("Sunday lookup respects the ward date, week and year boundaries, and missing records", () => {
  expect(getMostRecentSunday(new Date("2026-09-16T12:00:00Z"))).toBe("2026-09-13");
  expect(getMostRecentSunday(new Date("2026-09-12T23:30:00Z"))).toBe("2026-09-13");
  expect(getMostRecentSunday(new Date("2026-09-12T22:30:00Z"))).toBe("2026-09-06");
  expect(getMostRecentSunday(new Date("2026-01-01T10:00:00Z"))).toBe("2025-12-28");
  expect(getCurrentMeeting(new Date("2026-09-16T12:00:00Z"))?.id).toBe(5);
  expect(getCurrentMeeting(new Date("2030-01-01T12:00:00Z"))).toBeNull();
  expect(isValidDate("2026-02-30")).toBe(false);
  expect(isValidDate("2028-02-29")).toBe(true);
});

test("query results cannot mutate the scaffold", () => {
  const copy = getMeetings();
  copy[0].openingHymn.title = "Changed";
  expect(getMeetingById(copy[0].id)?.openingHymn.title).not.toBe("Changed");
});

test("programme ordering puts the most recent past date before future dates", () => {
  const dates = getMeetings(undefined, new Date("2026-09-16T12:00:00Z")).map((meeting) => meeting.date);
  expect(dates).toEqual(["2026-09-13", "2026-09-06", "2026-05-17", "2026-05-10", "2026-05-03", "2026-09-20", "2026-09-27"]);
  // Saturday UTC is already Sunday in Bariga; that programme now comes first.
  expect(getMeetings(undefined, new Date("2026-09-19T23:30:00Z"))[0].date).toBe("2026-09-20");
  expect(getMeetings(undefined, new Date("2026-01-01T12:00:00Z"))[0].date).toBe("2026-05-03");
  expect(getMeetings(undefined, new Date("2030-01-01T12:00:00Z"))[0].date).toBe("2026-09-27");
});

test("programme ordering reads left to right on desktop and tablet, top to bottom on mobile", async ({ page }) => {
  const meetings = getMeetings();
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
  const filtered = await request.get("/api/meetings?date=2026-05-03");
  expect(filtered.status()).toBe(200);
  const result: SacramentMeeting[] = await filtered.json();
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(1);
  expect(await (await request.get("/api/meetings?date=2030-01-06")).json()).toEqual([]);
  for (const date of ["", "not-a-date", "2026-02-30", "2026-5-3"]) {
    expect((await request.get(`/api/meetings?date=${date}`)).status()).toBe(400);
  }
});

test("item API distinguishes found, malformed, missing, and unsupported requests", async ({ request }) => {
  const response = await request.get("/api/meetings/5");
  expect(response.status()).toBe(200);
  const meeting: SacramentMeeting = await response.json();
  expect(meeting.id).toBe(5);
  expect(meeting.speakers.some((item) => item.type === "musical-number")).toBe(true);
  for (const id of ["abc", "1abc", "1.5", "1e2", "-1", "0", "9007199254740992"]) {
    const invalid = await request.get(`/api/meetings/${id}`);
    expect(invalid.status()).toBe(400);
    const error: ApiError = await invalid.json();
    expect(error.error).toBeTruthy();
  }
  expect((await request.get("/api/meetings/999999")).status()).toBe(404);
  expect((await request.post("/api/meetings")).status()).toBe(405);
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
  await page.getByRole("link", { name: "View agenda for Sunday, 13 September 2026" }).click();
  await expect(page.getByRole("heading", { name: "Sacrament meeting", exact: true })).toBeVisible();
  await expect(page.getByText("Following the Saviour through service")).toBeVisible();
  await expect(page.getByText("Musical number", { exact: true })).toBeVisible();
});

test("date filter, empty result, invalid date and unavailable meeting states", async ({ page }) => {
  await page.goto("/meetings");
  await page.getByLabel("Find a meeting by date").fill("2026-05-03");
  await page.getByRole("button", { name: "Find meeting" }).click();
  await expect(page.locator(".meeting-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Clear filter" }).click();
  await expect(page.locator(".meeting-card")).toHaveCount(7);
  await page.goto("/meetings?date=2030-01-06");
  await expect(page.getByRole("heading", { name: "No meeting scheduled for this date" })).toBeVisible();
  await page.goto("/meetings?date=2026-02-30");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("valid date");
  for (const id of ["abc", "99999"]) {
    await page.goto(`/meetings/${id}`);
    await expect(page.getByRole("heading", { name: "Meeting not found" })).toBeVisible();
  }
  await page.goto("/meetings/4");
  await expect(page.getByRole("heading", { name: "Bearing testimony" })).toBeVisible();
  await expect(page.getByText("No ward business scheduled.")).toBeVisible();
  await page.goto("/meetings/3");
  await expect(page.getByText("No announcements for this meeting.")).toBeVisible();
});

test("current route redirects to the most recent Sunday or the list", async ({ page }) => {
  const current = getCurrentMeeting();
  await page.goto("/meetings/current");
  await expect(page).toHaveURL(new RegExp(`${current ? `/meetings/${current.id}` : "/meetings"}$`));
  if (current) await expect(page.getByRole("navigation", { name: "Meetings navigation" }).getByRole("link", { name: "This Sunday" })).toHaveAttribute("aria-current", "page");
});

test("print control invokes printing and preserves the complete agenda on paper", async ({ page }, testInfo) => {
  await page.goto("/meetings/5");
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
  await expect(page.getByText("Bariga Ward · Programme 5")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("programme-print.png"), fullPage: true });
});

for (const width of [1440, 390]) {
  test(`pages have no detected WCAG A/AA violations or horizontal overflow at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, path] of [["home", "/"], ["meetings", "/meetings"], ["agenda", "/meetings/5"], ["not-found", "/meetings/99999"], ["empty", "/meetings?date=2030-01-06"]]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${name}: ${JSON.stringify(results.violations)}`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      if (["home", "meetings", "agenda"].includes(name)) await page.screenshot({ path: testInfo.outputPath(`${name}-${width}.png`), fullPage: true });
    }
  });
}
