# OWASP ZAP: bounded local security assessment

ZAP is the tool described in the teammate's notes (not Zapier). Start and seed the isolated stack as described in load-tests/README.md. From the repository root:

```sh
python3 security/run_scan.py baseline
python3 security/prepare_scan.py
python3 security/run_scan.py api
```

These commands target only http://frontend on the expense-manager-testing Docker network. The API scan actively sends attack payloads and can alter synthetic scanner records. Do not repoint it at public sites or real financial data. Seed/recreate disposable data if necessary. Run performance measurements separately.

The baseline spiders for one minute and performs passive checks. The active scan imports a generated OpenAPI subset covering profile, statistics, category/transaction/budget list and selected detail endpoints with GET/POST/PATCH/PUT and transaction filters. DELETE and login/register/refresh/logout are excluded to preserve fixtures/session; targeted backend tests cover their functional authorization behavior. This is not a complete API specification or exhaustive penetration test.

prepare_scan.py creates a scanner-only bearer token with a60minute expiry in ignored .zap.env, verifies its identity, and writes a sanitized preflight. Normal app access tokens remain5minutes. ZAP injects the header through its official authentication environment variables. A hook records aggregate status codes and confirms a successful scanner identity response inside ZAP without saving tokens or HTTP bodies. Active scanning is bounded to5minutes globally and1minute per rule; completed scheduling does not establish exhaustive rule coverage. Review api-scan-evidence.json alongside alerts.

The official image is pinned by digest. Reports are under reports/security/: HTML for review, JSON for analysis, Markdown, console log and exit status. Exit0 means no configured alert failures, 1 configured failures, 2 warnings requiring triage, 3 execution error. Warnings are not silently ignored or called clean. Authentication-evidence failure invalidates authenticated coverage even if the scanner itself finishes.

Review each alert's route, evidence, risk/confidence, reproducibility, and mitigation. Document accepted residual risks. Missing headers were hardened and rescanned; style-src unsafe-inline remains to support current charts. Private API responses are no-store. See docs/testing/DEFECTS.md and RESULTS.md. A scanner cannot establish object ownership correctness on its own; two-user API tests provide separate evidence.

References: https://www.zaproxy.org/docs/docker/api-scan/ ; https://www.zaproxy.org/docs/docker/scan-hooks/ ; https://www.zaproxy.org/docs/getting-further/authentication/handling-auth-yourself/
