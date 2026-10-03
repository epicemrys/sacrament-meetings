import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Tests call lib/meetings-db directly, so they need POSTGRES_URL like the app does.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: process.platform === "win32" ? "msedge" : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    // Run away from localhost:3000 without an API origin override, as previews do.
    env: { PORT: "3100", MEETINGS_API_ORIGIN: "" },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});