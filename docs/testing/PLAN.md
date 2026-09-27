# Backend/performance/security plan — defined before execution

Owner: user's portion, branch testing/backend-performance-security. Frontend/MSW/UI/E2E work remains with the other teammate.

Acceptance gates: application Python statement coverage >=90%, branch coverage >=85%; all named backend requirements mapped and executed; no failed/xfail required tests; k6 smoke/load p95 <500ms and request failure rate <1%, checks >=99%; no unresolved confirmed high-risk ZAP findings. Performance thresholds are local project goals, not capacity promises. Review all medium/low alerts and report accepted risks rather than silently ignoring them.

Scope: users/, expenses/ including seed command, config/ including handlers. Omit only migrations and empty package initializers from coverage. PostgreSQL integrations are not mislabeled as isolated unit tests. Property-based testing is an additional technique; confirm course novelty against actual lectures. No claim of complete path, MC/DC, or security coverage.

| Requirement | Test location | Criterion |
| --- | --- | --- |
| AUTH-01 register/hash/uniqueness | test_auth.py | valid, missing, invalid, duplicate partitions |
| AUTH-02 JWT login/refresh/logout | test_auth.py | session state transitions, expired/invalid tokens |
| OWN-01 private resource isolation | test_transactions.py, test_categories_budgets.py, test_filters_statistics.py | own/foreign objects across methods, no mutation on denial |
| TX-01 positive decimal/date/category | test_transactions.py | monetary boundaries, precision, missing/invalid inputs |
| CAT-01 uniqueness/type/references | test_categories_budgets.py | duplicate and reference decision outcomes |
| BUD-01 inclusive periods/state | test_financial_services.py, test_categories_budgets.py | below/equal/above, before/on/after date boundaries |
| FILTER-01 combined filters/search | test_filters_statistics.py | independent filters, combined intersection, invalid ranges |
| STAT-01 totals/breakdowns/months | test_financial_services.py, test_filters_statistics.py | empty/mixed/negative balance, owner isolation |
| DB-01 constraints/migrations | test_database_errors_seed.py | direct invalid writes rejected by PostgreSQL |
| ERR-01 structured safe failures | test_database_errors_seed.py | controlled 400/409/500 without exception disclosure |
| PROP-01 arithmetic invariants | test_properties.py | 200 deterministic generated examples per property |
| PERF-01 concurrent authenticated workflow | load-tests/expense-flow.js | declared load and thresholds with real responses |
| SEC-02 reported SQL payloads | test_security_boundaries.py | literal storage, parameter binding, duplicate rejection |
| SEC-01 scanner and targeted security | security/, backend ownership/auth tests | baseline + authenticated API scan, triage, retest |

Coverage is evidence of execution, not correctness; assertions and requirement mapping remain necessary. Preserve raw machine-readable reports separately from a concise reviewed summary. Never fabricate defects or results.

The explicit ISP models, Each Choice Coverage scope, boundary representatives and test mappings are in [ISP.md](ISP.md).
