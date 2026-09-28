# Combined verification and submission status

> Final status, 28 September 2026: both contributions are merged. All four jobs passed on published main `f07a840a5ecc52f0f90dbd79d9fefdcd4f55c3fb`. The joint PDF is complete; see [final report and evidence](../submission/README.md). Any statements below about unpublished changes, pending CI or pre-merge steps describe the historical stage when that evidence was recorded. Course upload remains the team's responsibility.


Verified locally on27 September2026, Europe/Skopje. Backend PR: https://github.com/erikoxha/expense-manager/pull/2 (79d2e3d325c2e82784cc387204a03f37bbb7ea97). Frontend PR: https://github.com/erikoxha/expense-manager/pull/1 (b1c0d9f90cf82b20981d11bc7a425222c4f8d46d). Both PRs remain open and unmerged.

A separate local checkout combined those exact parents without conflicts. Local merge commit: cf09df96e55d5ec7e6f5e1f6a9fddf3a9279d403; tree: e612ce9182ea966fe08d567f59583285f1ef16a4. That local merge commit is not published; reproduce the tested content by combining the two specified parent commits. The later backend documentation-only publication does not alter this tested application/test tree.

## Actual combined results

| Check | Result |
| --- | --- |
| Production Docker build |Passed, including Vite frontend build |
| Backend suite |161 passed in3.37s;98.94% statements,100% measured branches |
| Frontend component/MSW suite |37 passed;96.54% statements,91.76% branches |
| Real React browser UI on combined production app |2 passed; desktop/mobile content, colors, spacing and fit |
| Real browser full-stack workflow |1 passed; CRUD, budgets, filters, totals, Statistics/chart data, logout and user isolation |
| k6 combined smoke |42 iterations,334 requests,294 business checks passed;0% HTTP failures;p95 108.27ms |

Browser version: Chromium145.0.7632.6 / Playwright1.58.0 on macOS. Browser commands targeted only the disposable test stack at http://127.0.0.1:18080 with traces disabled. UI command selected the two `rendered React` tests. The two Windows fixture screenshot comparisons were not rerun on macOS; the full4-test UI suite passed in the frontend CI run below. Do not claim4 combined local UI tests.

Commands in the combined checkout: Docker Compose testing stack build; npm ci for frontend and e2e; npm run test:coverage --prefix frontend; python scripts/run_backend.py; PLAYWRIGHT_BASE_URL=http://127.0.0.1:18080 CI=1 npm run test:ui -- --grep 'rendered React'; same environment with npm run test:e2e; python3 load-tests/run.py smoke. UI/E2E commands run from e2e/. PLAYWRIGHT_BROWSERS_PATH pointed to the installed workspace browser cache.

Local frontend unit tests used Node24.12.0 and passed but emitted dependency engine warnings (some require24.15+). This does not establish support for24.12; use the documented supported version. CI uses Node24. The initial combined browser launch attempts were blocked by macOS Mach-port sandbox permission before application assertions. Repeating with authorized process permissions passed without test/source changes.

## Remote results

- Backend PR CI passed: https://github.com/erikoxha/expense-manager/actions/runs/36352063509
- Backend push CI passed: https://github.com/erikoxha/expense-manager/actions/runs/36352044150
- Frontend PR CI passed: https://github.com/erikoxha/expense-manager/actions/runs/36323477677
- Frontend push CI passed: https://github.com/erikoxha/expense-manager/actions/runs/36321297772

These remote runs verify their respective branch commits; combined checks above are local. Download artifacts before expiry (backend30days; frontend14days). The complete frontend HTML coverage directory is now uploaded by its workflow.

## Historical load and security evidence

The90second20-VU load run and ZAP scans remain the historical results in RESULTS.md and evidence/. They were not rerun in full during this integration check. Frontend application source and production dependency versions were unchanged by the frontend testing contribution. The combined build uses the backend fixes/private-cache middleware and Nginx policies; real charts and logout were verified again.

ZAP is not a clean security certificate: the retained high SQL alert is triaged as a false positive for the reported case, supported by literal-storage replay and parameter-binding tests; medium inline-style CSP and low unexpected-HTML findings remain documented. See DEFECTS.md for evidence and limitations.

## Submission readiness

The implementation/testing contributions and ISP mapping are ready for peer review. This is not yet a completed course submission. Remaining actions: review both PRs, merge only after team approval, inspect final main CI, retain evidence, produce and inspect the joint PDF, and have one team member submit it through the course assignment.

Title: Software Quality Testing of a Personal Expense and Budget Management Web Application. Team: Erjon Koxha231509 and Bora Alili231504. The supplied notice's deadline is28 September2026 at23:59 local time; no presentation date is specified in that notice. Confirm the schedule separately.

The Word report available in Downloads at this review still has an older opening summary (2 UI tests and a statement that E2E was not rerun). An unchanged received copy is saved outside the repository under outputs/submission. Obtain the newer file or correct those statements before incorporating it into the final PDF. This discrepancy does not invalidate the verified code/CI results.
