import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: ".",
  testMatch: "ui.spec.js",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: externalBaseURL || "http://127.0.0.1:5173",
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
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run dev --prefix ../frontend -- --host 127.0.0.1",
        url: "http://127.0.0.1:5173/register",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
