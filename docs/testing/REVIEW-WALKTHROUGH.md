# Both students: review and presentation walkthrough

## Start here

Your branch is `testing/backend-performance-security`. This guide was prepared before publication. Consult the linked PRs and current verification record for publication and merge status. Your friend owns frontend component/form tests, MSW integration, browser design checks, Playwright workflows, and their reports. She can work independently on her branch from the shared app baseline. When this branch is published, she should fetch and integrate its changes before the final combined run. Neither person should overwrite the other's work or use the other's Git identity.

Read RESULTS.md first, then PLAN.md, DEFECTS.md and one test from each owned layer. Spend enough time to rerun examples yourself and explain their assertions. AI assistance does not remove the need to understand or honestly describe the contribution.

## Your portion: what to understand

1. **Arrange, act, assert.** A fixture creates Alice/Bob and their records; a request exercises actual application code; assertions check status, response and stored state. A200 alone does not prove a financial calculation is correct.
2. **Unit vs integration.** The pure budget helper is unit tested. APIClient requests pass through Django/DRF and real PostgreSQL, so those are integration tests, even though no browser or network server is involved. k6 drives the full HTTP server stack.
3. **Test selection.** For money, partition valid/invalid values and test the edges. For budgets, use before/on/after each date boundary and below/equal/above the amount. For authorization, use two users and multiple HTTP methods. Explain the expected result before reading the implementation.
4. **Property testing.** Instead of only a few example amounts, Hypothesis generates many amounts/spending values. The invariant is `remaining + spent = budget`, and increasing spending cannot increase remaining. Generated data complements examples; it does not prove every input is correct.
5. **Coverage.** Statement coverage tells you which lines ran. Branch coverage tells you which measured decisions took each outcome. Our100% branch result does not mean100% correctness. WSGI bootstrap remains uncovered in pytest. Targets were90% statements/85% branches; do not lower them just to make CI green.
6. **Load.** k6 ramps to20 users for a short local test. Explain p95, error rate and business checks separately. The workload includes CRUD and statistics, with a pause, distinct accounts, two Gunicorn workers and PostgreSQL. It does not establish maximum capacity or internet response time.
7. **Security.** ZAP baseline is passive; the API scan actively sends payloads. Authentication was verified inside ZAP. Some endpoints and methods are intentionally excluded. Read each finding instead of treating a green exit as proof. Keep the SQL-alert replay and parameter-binding evidence; retain the original high alert with its triage.
8. **Defect/retest story.** Show the two failing logout cases before the fix, the small authentication/ownership change, and the passing regression tests. Explain that a stolen refresh token was a prerequisite for the cross-account case. The scan header changes are separate hardening work.

## Your friend: what to understand

- Component tests check a component's visible behavior and form validation in a simulated DOM; they do not establish real browser geometry.
- MSW integration should intercept HTTP while the real frontend services/hooks/components run. Cover success, loading, empty, API errors, expired session and network failure. A mocked backend is a controlled contract, not proof the real backend works.
- Browser design checks should assert the documented colors, spacing, text and responsive behavior against an independent specification, not copy whatever values currently render. Review screenshot changes visually before updating baselines.
- Playwright E2E uses the real app and database: registration/login, categories, transactions, budgets, updated totals, filters, edits/deletions and logout. Use disposable accounts and deterministic dates; distinguish failures from flaky waits or shared data.
- Frontend coverage reports have their own scope and gates; backend percentages cannot stand in for hers. A test that mocks away the component/service being checked has weak evidence.
- New integration details: logout requires an access JWT and rejects another account's refresh token with403. Private API responses are no-store. Preserve the Nginx CSP and new security headers; verify charts and flows against the production build. The basic local smoke check showed sign-in, financial totals and charts rendering after these changes, but this is not her automated E2E suite.

## Before approving either pull request

A pull request is a proposed set of changes; approving it records your review, and merging integrates it into main.

1. Read its purpose, files changed, linked criteria, actual test command and results. Ensure it touches the agreed layer; coordinate shared README, Compose, workflows and Nginx changes.
2. Inspect one valid and one invalid case, an ownership/error case, and a financial or UI expected value. Check that assertions would fail for a plausible bug.
3. Look for skipped tests, blanket mocks, weakened thresholds, arbitrary sleeps, unexplained snapshot updates, ignored scanner findings and tests that only repeat the implementation.
4. Open CI logs/artifacts for the latest commit, not an older green run. A newly configured workflow has no remote result until pushed. Confirm zero failing required tests, no unexplained skips and the expected coverage scope.
5. Run the relevant suite locally on the proposed branch if practical. For shared product changes, run both suites again on the combined branch after integration.
6. Check that no .env, tokens, passwords, browser authentication state, real financial data or secret-bearing reports are included. Synthetic test passwords are not production credentials.
7. Review the documented limitations and accepted medium/low risks. A scan warning may be a false positive, but requires evidence; a passing coverage gate is not enough.
8. Ask for specific changes if something is unclear. Approve only when you can explain the important behavior. Do not merge merely to make the contribution graph look balanced.

## GitHub and reports

Each student uses her own verified account and locally configured author identity. Push each real reviewed contribution to its own branch, then open a PR to the shared repository. Do not rewrite authorship or invent work. Publish through the verified owner account and retain the exact PR and CI run links.

Backend CI is configured to upload reports for30days. Keep reviewed final evidence in docs/testing/evidence and retain the final submission bundle beyond CI expiry. A separate reports repository is optional, not stated in the supplied assignment. If used, link report runs to exact source commits and keep them sanitized.

## A practical joint rehearsal

You: explain the budget boundary test, run the backend suite, read the coverage gate, explain the load graph/workload and show one security finding with triage.

Friend: explain one component test, one MSW failure case, one real CSS assertion and one complete E2E workflow, then open her actual reports.

Together: trace a browser action through frontend service → API validation/auth → PostgreSQL → computed response → rendered UI. Explain what each layer catches that another misses. Review one actual defect and one limitation each.

Likely questions: Why PostgreSQL rather than SQLite? Why test foreign-user IDs? What is p95? Why isn't100% branch coverage a proof? How did you verify ZAP was logged in? Why retain a medium finding? How do mocks differ from E2E? Which technique is beyond the course? Property-based testing, load testing and DAST are candidates based on the supplied lecture titles; confirm novelty with actual course material/instructor rather than promising points.

## Final submission still needed

Merge and rerun both portions; add both index numbers and topic; include repository links, test criteria, tools/versions, exact reproduction commands, results, defects/retests and limitations in one final PDF. Validate every link and report. The supplied deadline is28 September2026 at23:59 Europe/Skopje. Neither the backend result alone nor a repository without the required PDF completes the submission.
