# Historical execution evidence — 26 September 2026 UTC

These are local results for the working tree on testing/backend-performance-security, based on commit b3779333033f3a60af27b36955d83c2d845eae81. The base commit alone does not contain the new tests; evidence/source-manifest.json identifies source/tool files by SHA256. At the time of these original runs, the testing branch was unpublished and CI had not run. Publication and integration results are recorded separately; do not treat this historical statement as current branch status.

| Layer | Actual result | Interpretation |
| --- | --- | --- |
| Backend |161 passed, no skips/failures; final run3.15s | Real PostgreSQL integration plus pure arithmetic tests |
| Statement coverage |375/379 =98.94% | Passes90% gate; four WSGI bootstrap lines unexecuted |
| Branch coverage |60/60 =100% | Passes85% gate; measured Python branches only |
| Hypothesis |2 properties, up to200 generated examples each | Part of161 collected cases, not400 extra test cases |
| k6 smoke |44 iterations,348 HTTP requests,308 checks passed; p95 114.64ms |2 VUs/10s; earlier configuration before header hardening |
| k6 final load |2,439 iterations,17,113 requests,17,073 checks passed; p95 22.44ms |Ramp to20 VUs;90s workload plus setup/graceful completion |
| k6 final error rate |0%;100% checks |All declared thresholds passed; no interrupted iterations |
| ZAP baseline retest |Exit2;1 medium finding plus informational alerts |Inline-style CSP allowance retained; other initial header warnings removed |
| Authenticated ZAP API |Exit2;1 high,1 low alert type plus informational alerts |High SQL alert triaged false positive for reported case; original preserved |

Final load average10.24ms, maximum149.65ms, about183.89 requests/second including setup. Do not generalize these local measurements to public deployment or maximum capacity. The final load ran separately after scans and after security hardening. Initial load before hardening is retained locally for provenance; it is not a controlled performance comparison.

ZAP recorded5,152 HTTP messages and a successful scanner identity response. Active scan state FINISHED/progress100,5,076 requests. Recorded statuses:200=424,201=82,400=4,285,404=81,301=247,409=2 and0=32 (no normal HTTP response recorded). Many requests were rejected attack payloads; this is not equivalent to valid business-flow coverage. Bounds:5minutes total active scanning/1minute per rule; omitted auth operations and DELETE. A completed bounded scan is not exhaustive security coverage.

The high alert remains visible in evidence/zap-api.json. Live replay stored both boolean payload strings literally and rejected both duplicates. Regression cases verify parameterized database execution and unchanged foreign-user data. See DEFECTS.md for the reasoning, retained residual medium style policy and low unexpected-HTML finding. No confirmed high-risk vulnerability remains from the investigated scan, but this is not a claim that none exist.

Environment: macOS host, Python3.12.14, Django5.2.17, PostgreSQL16.15, Docker29.1.3 with10 CPUs and8,217,448,448 bytes allocated memory; Gunicorn2 workers, Nginx production frontend. Test dependencies and scanner images are pinned in their lockfile/runners. PostgreSQL16-alpine and application build base tags are not fully pinned; record fresh environment versions when reproducing.

A manual browser smoke check after header hardening verified sign-in, a synthetic expense total and visible cash-flow/category charts. This is not automated frontend/E2E evidence. The friend's component/MSW/UI/E2E suites and final combined execution remain outstanding.

## Evidence and reports

Reviewed machine-readable evidence is committed-ready under evidence/. Full local HTML/JUnit/XML reports are under reports/ (ignored) and included in the local expense-manager-testing-reports.zip deliverable. Backend CI is configured to upload reports for30days after publishing; no remote success is claimed. Retain the final evidence/PDF independently of temporary artifact retention.

The scan runner's final authentication-evidence guard was added after this recorded scan; the recorded hook evidence is valid, but that new failure guard has only received syntax review, not a separate failed-authentication execution. This limitation does not change the retained successful scan evidence.
