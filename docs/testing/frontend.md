# Frontend tests

> Final status, 28 September 2026: both contributions are merged. All four jobs passed on published main `f07a840a5ecc52f0f90dbd79d9fefdcd4f55c3fb`. The joint PDF is complete; see [final report and evidence](../submission/README.md). Any statements below about unpublished changes, pending CI or pre-merge steps describe the historical stage when that evidence was recorded. Course upload remains the team's responsibility.


## What each layer proves

- **Components (Vitest + React Testing Library):** checks accessible labels and field errors, budget state text, and the visual progress cap. These run in jsdom; they do not prove browser layout.
- **Mocked integration (Vitest + MSW):** renders the real authentication and categories UI, hooks, and HTTP services. MSW intercepts fetch at the HTTP boundary. It exercises registration/login validation, loading and empty results, retry after a 500, refresh-token rotation, rejected refresh, 204, 403, 404, 500, and network failure. These checks prove frontend handling of controlled responses, not Django behavior.
- **Browser UI (Playwright):** checks both an isolated stylesheet fixture and the actual React registration page served by Vite. The real-page checks cover desktop/mobile text, computed colors, explicit spacing, layout columns, and horizontal fit. Reviewed desktop/mobile screenshots remain scoped to the isolated fixture.
- **Real-app E2E (Playwright):** runs against the React app, Django, and PostgreSQL. It registers disposable users and exercises categories, income/expenses, a budget, filters, edits/deletes, dashboard totals, the Statistics page and rendered charts, logout, and another account's empty category list. This is the only layer here that claims the whole app/API/database workflow.

## Run locally

Requirements: Node.js `^22.22.2 || ^24.15.0 || >=26.0.0` and npm, matching the locked jsdom dependency's declared engine range. Node 24.21.0 was used for the recorded local run. For real-app E2E, follow the repository README to configure a local `.env` and start Docker Compose; never commit or share `.env`.

From the repository root:

```sh
cd frontend
npm ci
npm test
npm run test:coverage
npm run build
```

Browser checks:

```sh
cd e2e
npm ci
npx playwright install chromium
npm run test:ui
```

For real-app E2E, start the app with the README's Docker Compose instructions, then run from `e2e/`:

```sh
npm run test:e2e
```

The default browser URL is `http://127.0.0.1:8080`. Set `PLAYWRIGHT_BASE_URL` to use another local app URL. Open a generated HTML report with `npm run report`. Playwright stores local failure screenshots and traces under `e2e/test-results`; traces can contain authorization headers, so inspect and sanitize them before sharing.

## Coverage scope and limits

Vitest V8 coverage includes all `frontend/src` JavaScript/JSX application files except `src/main.jsx` (the browser bootstrap) and the test files themselves. It emits text, HTML, and LCOV reports in `frontend/coverage`. No difficult application modules are omitted. The handoff's minimums are 85% statement and 80% branch coverage; they are enforced by Vitest, not a grading guarantee. Coverage cannot show that assertions are meaningful or that browser rendering and Django behavior are correct.

The Vitest configuration enforces minimums of 85% statement and 80% branch coverage. A coverage run fails if either minimum is missed. CI uploads the complete `frontend/coverage/` directory so the HTML report's linked assets and file pages remain available.

## Requirements-to-test map

| Requirement | Evidence |
| --- | --- |
| Form labels, field errors, budget status, delete-dialog keyboard behavior while busy | `frontend/src/tests/ui.test.jsx` |
| Login/register success and API field errors | `frontend/src/tests/auth.integration.test.jsx` |
| Protected page loading, empty state, 500 and retry | `frontend/src/tests/categories.integration.test.jsx` and `frontend/src/tests/layout.integration.test.jsx` |
| Category create/edit/validation/delete retry, transaction create/edit/filter/pagination/delete, budget create/edit/delete, dashboard totals and statistics empty states | `frontend/src/tests/pages.integration.test.jsx` |
| Refresh success/failure, expired-session cleanup, malformed storage/response, paginated resources, 204, 403, 404, 500, network failure | `frontend/src/tests/api.integration.test.js` |
| Isolated stylesheet fixture tokens and responsive screenshots, plus actual React auth page desktop/mobile requirements | `e2e/ui.spec.js` and `e2e/ui.spec.js-snapshots/`; `npm run test:ui` starts Vite automatically |
| Real registration, CRUD, filtering, totals, Statistics charts, logout and account isolation | `e2e/workflows.spec.js` (requires the real app) |

The backend unit/API/database suite, k6, ZAP, and their coverage belong to the teammate's assigned portion and are not represented by these frontend results.

## Presentation walkthrough

- **Component:** render `Field` with an `amount` error, then assert the label is discoverable, `aria-invalid` is true, and `aria-describedby` points to the visible message. This catches a broken validation association.
- **MSW error:** MSW returns 500 for the real categories fetch. The page shows a generic server message, hides internal exception details, and retries to an empty success response. This proves the frontend's error/retry behavior, not that Django returns the right error.
- **CSS and UI:** the isolated Playwright fixture loads `styles.css` and checks tokens, radii, focus, and screenshots. Separate browser checks open the actual React `/register` route served by Vite and inspect its text, computed colors, spacing, and desktop/mobile fit. This uses a real browser because jsdom does not calculate layout.
- **E2E:** the browser registers a fresh account, writes records through the real app, checks totals after editing and deleting, and verifies statistics summary and charts. The isolated second user cannot see the first user's categories. Explain the run only after the real backend workflow passes in CI or locally.

## Result record

Update this section after each final verification run. Include date, tested commit, Node/npm/Vitest/MSW versions, exact command, test count, coverage totals, browser version, and any blocked checks. Do not copy planned or prior development smoke-check results as outcomes of this suite.

### Verified run on 2026-09-27

- Published baseline commit: `63ea936ed05d051bc5d7dae5e05fa63ea129e47d` on `testing/frontend-integration-e2e`.
- GitHub Actions completed successfully for this exact commit: [run 36307548442](https://github.com/erikoxha/expense-manager/actions/runs/36307548442). All three jobs passed: frontend build/tests/coverage, Windows browser UI checks, and Linux real-app E2E. This run verifies the published baseline commit and does not include the review follow-up changes described below.
- Runtime: Node 24.21.0, npm 11.19.0, Vitest 5.0.2, MSW 2.15.0, Playwright 1.58.0, Chromium 145.0.7632.6. On Windows PowerShell, `npm.cmd` was used because the execution policy blocks `npm.ps1`; no policy change was needed.
- `cd frontend && npm.cmd run test:coverage`: **7 files passed, 37 tests passed**. Statements 96.54% (363/376), branches 91.76% (234/255), functions 96.06% (122/127), lines 97.13% (339/349).
- The handoff's 85% statement and 80% branch targets were exceeded; the review follow-up now enforces these thresholds in Vitest. Coverage includes all `frontend/src` JavaScript/JSX except `src/main.jsx` (browser bootstrap) and test files. Coverage is not proof that assertions are sufficient or that the API/backend is correct.
- The newly expanded cases cover session restore and expiry, logout success and failure, retry after a profile error, category validation and failed-delete retry, transaction edit/type-category filtering, malformed stored session/response data, paginated resource reads, and the busy confirmation dialog's Escape behavior.
- The successful baseline CI run above is the reproducible evidence for the published commit. The user's VS Code terminal also reported `npm.cmd run build` passed on 2026-09-26 (Vite 6.4.3, 2194 modules); `npm.cmd run test:ui` passed **2 browser UI tests** using Chromium 145.0.7632.6; and the real-app workflow passed **1 Playwright E2E test** against the local app at `http://127.0.0.1:8080`.
- Reverification attempts on 2026-09-27: the build command from the Codex-restricted shell failed because esbuild could not read an ancestor directory (`Access is denied`); this is a sandbox limitation and does not negate the successful VS Code build on 2026-09-26. The first Playwright UI rerun failed 0/2 because Playwright looked in the default browser cache; setting `PLAYWRIGHT_BROWSERS_PATH` to the installed Chromium cache fixed setup, and the rerun passed **2/2**. The real-app E2E was not repeated in that run. The E2E creates uniquely named accounts and the app has no account-deletion endpoint; records from the prior local-app run may remain.
- Review follow-up after commit `63ea936`: actual React desktop/mobile browser checks, enforced coverage thresholds, full coverage artifact upload, and Statistics-chart assertions were added locally. These follow-up changes have not yet been run in GitHub Actions; the linked CI run is for the earlier published baseline only. After local verification, publish this branch update and confirm the next CI run before treating these additions as verified.
- Review-follow-up local verification on 2026-09-27: `npm.cmd run test:coverage` passed 7 files/37 tests at 96.54% statements, 91.76% branches, 96.06% functions, and 97.13% lines; the new thresholds passed. `npm.cmd run test:ui` passed 4/4 Playwright tests against the running app at `http://127.0.0.1:8080`, including actual React registration desktop/mobile checks. `npm.cmd run test:e2e` passed 1/1 against that app, including the new Statistics balance, chart data, and rendered-chart assertions. These local runs do not extend the older CI result to the follow-up commit.
- The review-follow-up production build attempt was blocked before Vite loaded because the Codex shell could not read an ancestor Desktop directory (`Access is denied`). The user's VS Code build and the published baseline CI build passed, but the follow-up build still needs CI evidence. The first updated mobile UI run had 1 assertion failure because the test checked the child heading instead of the hidden responsive parent; after correcting the selector, the full 4-test UI suite passed.

### Test-authoring/debug attempts recorded

- Earlier harness issues fixed before the original 25-test passing run: reset filters omit empty query parameters; jsdom needed direct date input events; the post-create redirect needed a transactions-list response; number inputs normalize `18.50` to `18.5`; dashboard/statistics assertions needed to await data; and the dashboard's `Transactions` text was ambiguous with its navigation link.
- During this coverage improvement, three additional test-only failures were corrected: a paginated-resource handler used `/api/categories/` even though the client already prepends `/api`; the confirmation button's busy accessible name is `Deleting…`; and a test route needed `/transactions/:id/edit` so React Router supplied the transaction ID. The edit page heading appears before its API data, so the test now waits for the form before interacting. These were test setup/assertion failures, not production application defects.
- The first targeted test-authoring run had 2 failures among 20 tests, then passed 20/20 after those corrections. The transaction edit test initially failed twice on route setup/readiness, then passed; the final complete 37-test coverage run passed.

- A later re-verification attempt (`npm.cmd run test:coverage`) was blocked before tests began: Windows returned `EPERM` while Vitest tried to remove the existing `frontend/coverage` directory. Retrying with `--coverage.clean=false` was also blocked when Vitest tried to create `frontend/coverage/.tmp`. These are report-directory permission failures; the previously completed 37/37 coverage run remains the last successful full run.
