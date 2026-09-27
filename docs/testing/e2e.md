# Real-app browser E2E

These Playwright tests use the documented app, not API mocks. They are separate from Vitest/MSW so they can verify persisted results across React, Django, and PostgreSQL.

## Prerequisites

1. Node.js 22+ and npm.
2. Docker Desktop with Compose running.
3. A local `.env` created from `.env.example` with fresh values, as described in the repository README. Keep it local and never commit it.
4. The repository's app started with `docker compose up --build -d`; wait until `http://localhost:8080` is available.

From `e2e/`, install the locked browser test dependency and Chromium once:

```sh
npm ci
npx playwright install chromium
```

Run the real backend workflow:

```sh
npm run test:e2e
```

The default URL is `http://127.0.0.1:8080`. Override with `PLAYWRIGHT_BASE_URL` if needed. To inspect the HTML report, run `npm run report` after a test run.

## Data and determinism

The workflow uses a unique generated username/email and explicit transaction dates and current-month budget boundaries. It does not read the seeded demo-account totals. Create these accounts only in a disposable local or CI database; the API has no account-deletion endpoint, so use an ephemeral CI database or reset a local test database intentionally. Never point this test at real financial data.

The browser is Chromium with `en-IE`, `Europe/Skopje`, reduced motion and a fixed viewport for screenshots. The separate CSS browser tests use 1440×900 desktop and 390×844 mobile viewports with checked-in, reviewed snapshots.

## Reports and sensitive data

HTML reports and failure screenshots are written under `e2e/playwright-report` and `e2e/test-results`; both are ignored by Git. Local failure traces can contain generated auth tokens in network headers. Do not publish a raw trace. CI disables traces and uploads the HTML report and failure evidence from the disposable test account only.

## What the workflow covers

The real-app test registers a user; creates expense/income and temporary categories; edits/deletes an unused category with confirmation; adds income and two expenses; creates/edits/deletes a budget; filters, edits and deletes a transaction; checks updated dashboard totals; logs out; and registers a second user to confirm the first user's categories are not listed. This is a frontend-owned smoke of a cross-layer workflow, not a replacement for the teammate's backend authorization suite.


## Latest local E2E result

On 2026-09-26, `npm.cmd run test:ui` passed 2 browser UI checks, and `npm.cmd run test:e2e` passed 1 real-app workflow using Chromium 145.0.7632.6 against `http://127.0.0.1:8080`. The run covered registration, categories, income/expense transactions, budget management, filtering, totals, logout, and a second user's empty category list. It was run against the user's local app, not a disposable CI database; its uniquely named test accounts and related records may remain because the API has no account-deletion route. No CI run has been performed on this unpushed branch.

The workflow first failed while its notice locator matched both the success notice and a loading status; it now waits for the exact success text. An earlier budget request assertion also expected a string category where the form sends a numeric category; that test assertion was corrected. The final one-test workflow passed after these fixes.

On 2026-09-27, the first UI-suite rerun could not launch Chromium (0/2) because Playwright looked in its default cache. The browser was already installed in the Codex tools cache; setting `PLAYWRIGHT_BROWSERS_PATH` to that cache corrected the setup, and the rerun passed 2/2. The real-app E2E workflow was not repeated because the frontend changes since its passing run are test and documentation additions; the integrated teammate branch has not yet been published/combined.
