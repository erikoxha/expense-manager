# Application-phase verification

Date: 25 September 2026. These are development smoke checks, not the future automated testing submission. No reusable automated test suites have been added to the repository.

## Completed

- Installed pinned backend dependencies and frontend lockfile dependencies.
- Built the React production bundle successfully.
- Django system check: no issues.
- Migration drift check: no changes detected.
- Applied all committed migrations to PostgreSQL 16 in Docker.
- Seeded two distinct demo users, 56 transactions, 14 categories and six budgets in total.
- Validated the Compose configuration and built both application images.
- Started PostgreSQL, Django/Gunicorn and React/Nginx containers.
- Confirmed the Docker frontend returns 200 and its unauthenticated private API returns 401.
- Confirmed login, search and record deletion through the Nginx API proxy.
- Exercised 49 HTTP requests against the running Django/PostgreSQL app. The scenarios included registration, login, invalid credentials, missing/invalid tokens, profile, category/transaction/budget creation and updates, deletes, combined transaction filters, invalid filters, decimal boundaries, invalid dates, mismatched category types, protected category deletion, other-user reads/updates/deletes, token refresh rotation, blacklist rejection and logout.
- Checked exact financial totals against seeded values: income 14,600.00, expenses 5,820.00, balance 8,780.00 and 28 transactions per demo user.
- Checked budget state transitions through WITHIN_BUDGET, REACHED and OVER_BUDGET.
- Browser: signed in, viewed real dashboard charts/statistics/budget states, created a transaction, searched for it, edited its amount, checked success feedback, opened the deletion confirmation and canceled it. The disposable browser record was then removed through the API.
- Responsive DOM checks: dashboard document width matches viewport at 1440px and 390px after charts settle. Wide tables and mobile navigation scroll inside their own containers.

## Fixes during development

- Added transaction create/edit success feedback on return to the list.
- Added income breakdown to the dashboard.
- Kept logout accessible on mobile.
- Split charts into a separate build chunk.
- Added safe handling for malformed stored sessions and refresh-aware logout payloads.
- Serialized category type changes and record mutations with database row locks.
- Restricted API rendering to JSON and added a generic JSON response for unexpected server errors.

## Limitations and next phase

These checks are not exhaustive, do not establish test coverage, and do not replace the planned unit/component/integration/E2E/load/security suites. Multi-browser accessibility, concurrency stress, token-expiry edge cases, load thresholds and a formal security assessment remain for the selected testing phase. The project is available locally; no public application hosting has been provisioned. The final course PDF still needs team index numbers and actual testing-method/result documentation.
