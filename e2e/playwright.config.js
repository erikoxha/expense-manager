import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: ["ui.spec.js", "workflows.spec.js"],
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8080",
    browserName: "chromium",
    trace: process.env.CI ? "off" : "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    locale: "en-IE",
    timezoneId: "Europe/Skopje",
    colorScheme: "light",
    reducedMotion: "reduce",
    ...devices["Desktop Chrome"],
  },
});
