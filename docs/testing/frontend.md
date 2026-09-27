# Frontend tests

## What each layer proves

- **Components (Vitest + React Testing Library):** checks accessible labels and field errors, budget state text, and the visual progress cap. These run in jsdom; they do not prove browser layout.
- **Mocked integration (Vitest + MSW):** renders the real authentication and categories UI, hooks, and HTTP services. MSW intercepts fetch at the HTTP boundary. It exercises registration/login validation, loading and empty results, retry after a 500, refresh-token rotation, rejected refresh, 204, 403, 404, 500, and network failure. These checks prove frontend handling of controlled responses, not Django behavior.
- **Browser UI (Playwright):** reads the real `frontend/src/styles.css` and checks documented colors, radii, focus styling, desktop columns, mobile fit, and reviewed desktop/mobile screenshot baselines. It renders a small representative login fixture so the stylesheet can be checked independently of server availability.
- **Real-app E2E (Playwright):** runs against the React app, Django, and PostgreSQL. It registers disposable users and exercises categories, income/expenses, a budget, filters, edits/deletes, dashboard totals, statistics, logout, and another account's empty category list. This is the only layer here that claims the whole app/API/database workflow.

## Run locally

Requirements: Node.js 22+ (Node 24 recommended) and npm. For real-app E2E, follow the repository README to configure a local `.env` and start Docker Compose; never commit or share `.env`.

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

Vitest V8 coverage includes all `frontend/src` JavaScript/JSX application files except `src/main.jsx` (the browser bootstrap) and the test files themselves. It emits text, HTML, and LCOV reports in `frontend/coverage`. No difficult application modules are omitted. The proposed handoff targets are 85% statement and 80% branch coverage; they are targets, not a grading guarantee. Record the measured totals from the generated report and say plainly if either target is not met. Coverage cannot show that assertions are meaningful or that browser rendering and Django behavior are correct.

## Requirements-to-test map

| Requirement | Evidence |
| --- | --- |
| Form labels, field errors, budget status, delete-dialog keyboard behavior while busy | `frontend/src/tests/ui.test.jsx` |
| Login/register success and API field errors | `frontend/src/tests/auth.integration.test.jsx` |
| Protected page loading, empty state, 500 and retry | `frontend/src/tests/categories.integration.test.jsx` and `frontend/src/tests/layout.integration.test.jsx` |
| Category create/edit/validation/delete retry, transaction create/edit/filter/pagination/delete, budget create/edit/delete, dashboard totals and statistics empty states | `frontend/src/tests/pages.integration.test.jsx` |
| Refresh success/failure, expired-session cleanup, malformed storage/response, paginated resources, 204, 403, 404, 500, network failure | `frontend/src/tests/api.integration.test.js` |
| Documented CSS and responsive screenshots | `e2e/ui.spec.js` and `e2e/ui.spec.js-snapshots/` |
| Real registration, CRUD, filtering, totals, logout and account isolation | `e2e/workflows.spec.js` (requires the real app) |

The backend unit/API/database suite, k6, ZAP, and their coverage belong to the teammate's assigned portion and are not represented by these frontend results.

## Presentation walkthrough

- **Component:** render `Field` with an `amount` error, then assert the label is discoverable, `aria-invalid` is true, and `aria-describedby` points to the visible message. This catches a broken validation association.
- **MSW error:** MSW returns 500 for the real categories fetch. The page shows a generic server message, hides internal exception details, and retries to an empty success response. This proves the frontend's error/retry behavior, not that Django returns the right error.
- **CSS:** Playwright loads `styles.css` in Chromium and reads `--primary`, the button/input radii and focused input outline. It also compares the reviewed desktop/mobile screenshots. This uses a real browser because jsdom does not calculate layout.
- **E2E:** the browser registers a fresh account, writes records through the real app, and checks totals after editing and deleting. The isolated second user cannot see the first user's categories. Explain the run only after the real backend workflow passes in CI or locally.

## Result record

Update this section after each final verification run. Include date, tested commit, Node/npm/Vitest/MSW versions, exact command, test count, coverage totals, browser version, and any blocked checks. Do not copy planned or prior development smoke-check results as outcomes of this suite.

### Verified run on 2026-09-27

- Baseline commit: `b3779333033f3a60af27b36955d83c2d845eae81`; all test and configuration changes remain uncommitted on `testing/frontend-integration-e2e`.
- Runtime: Node 24.21.0, npm 11.19.0, Vitest 5.0.2, MSW 2.15.0, Playwright 1.58.0, Chromium 145.0.7632.6. On Windows PowerShell, `npm.cmd` was used because the execution policy blocks `npm.ps1`; no policy change was needed.
- `cd frontend && npm.cmd run test:coverage`: **7 files passed, 37 tests passed**. Statements 96.54% (363/376), branches 91.76% (234/255), functions 96.06% (122/127), lines 97.13% (339/349).
- The handoff's proposed 85% statement and 80% branch targets are met. Coverage includes all `frontend/src` JavaScript/JSX except `src/main.jsx` (browser bootstrap) and test files. Coverage is not proof that assertions are sufficient or that the API/backend is correct.
- The newly expanded cases cover session restore and expiry, logout success and failure, retry after a profile error, category validation and failed-delete retry, transaction edit/type-category filtering, malformed stored session/response data, paginated resource reads, and the busy confirmation dialog's Escape behavior.
- Prior verified checks on 2026-09-26: the user’s VS Code terminal reported `npm.cmd run build` passed (Vite 6.4.3, 2194 modules); `npm.cmd run test:ui` passed **2 browser UI tests** using Chromium 145.0.7632.6; the real app workflow passed **1 Playwright E2E test** against the locally running app at `http://127.0.0.1:8080`.
- Reverification attempts on 2026-09-27: the build command from the Codex-restricted shell failed because esbuild could not read an ancestor directory (`Access is denied`); this is a sandbox limitation and does not negate the successful VS Code build on 2026-09-26. The first Playwright UI rerun failed 0/2 because Playwright looked in the default browser cache; setting `PLAYWRIGHT_BROWSERS_PATH` to the already installed Codex Chromium cache fixed setup, and the rerun passed **2/2**. No real-app E2E rerun was needed for test/doc-only changes. The E2E creates uniquely named accounts and the app has no account-deletion endpoint; records from the prior local-app run may remain. No GitHub Actions run has occurred because the branch is unpushed.

### Test-authoring/debug attempts recorded

- Earlier harness issues fixed before the original 25-test passing run: reset filters omit empty query parameters; jsdom needed direct date input events; the post-create redirect needed a transactions-list response; number inputs normalize `18.50` to `18.5`; dashboard/statistics assertions needed to await data; and the dashboard's `Transactions` text was ambiguous with its navigation link.
- During this coverage improvement, three additional test-only failures were corrected: a paginated-resource handler used `/api/categories/` even though the client already prepends `/api`; the confirmation button's busy accessible name is `Deleting…`; and a test route needed `/transactions/:id/edit` so React Router supplied the transaction ID. The edit page heading appears before its API data, so the test now waits for the form before interacting. These were test setup/assertion failures, not production application defects.
- The first targeted test-authoring run had 2 failures among 20 tests, then passed 20/20 after those corrections. The transaction edit test initially failed twice on route setup/readiness, then passed; the final complete 37-test coverage run passed.

- A later re-verification attempt (`npm.cmd run test:coverage`) was blocked before tests began: Windows returned `EPERM` while Vitest tried to remove the existing `frontend/coverage` directory. Retrying with `--coverage.clean=false` was also blocked when Vitest tried to create `frontend/coverage/.tmp`. These are report-directory permission failures; the previously completed 37/37 coverage run remains the last successful full run.
