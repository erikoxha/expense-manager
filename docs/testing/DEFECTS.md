# Defects discovered and retested

## AUTH-LOGOUT-01 — missing authentication (fixed)

Before: POST /api/auth/logout/ with a valid refresh token and no access Authorization header returned200 and blacklisted it. Expected:401, matching the documented private endpoint. The default SimpleJWT blacklist view allowed this. Fix: LogoutView explicitly requires JWT authentication and IsAuthenticated. A regression test reproduces the request and now passes. Preserved before-fix output is in evidence/logout-regression-before.txt.

## AUTH-LOGOUT-02 — refresh-token ownership (fixed)

Before: Alice's authenticated request could blacklist Bob's valid refresh token, returning200. Expected:403 without invalidating Bob's session. Exploitation requires possession of another user's token; this is an authorization defect, not proof of token theft. OwnedTokenBlacklistSerializer now checks refresh user_id against the authenticated user before blacklisting. Regression verifies the rejected action and Bob's token remains usable. The before-fix run showed both targeted cases failing; the final full suite passes.

## HEADERS-01 — ZAP baseline configuration findings (hardened; residual risk)

The initial baseline reported CSP missing non-fallback directives, permissive inline styles, missing cross-origin isolation/permissions policies and nginx version disclosure. Added object-src/base-uri/form-action restrictions, COOP/COEP/CORP and Permissions-Policy; suppressed nginx version. Nginx configuration is the only frontend file touched by this portion. The friend must preserve/review it and check chart rendering in browser tests.

The policy still permits inline styles required by the current chart implementation. This is a documented medium-risk residual configuration finding; removing it without changing rendering breaks styling. Scripts remain same-origin without unsafe-inline. Do not describe the application as free of security risks.

## CACHE-01 — private financial responses (hardening)

Review identified missing explicit no-store headers on private API responses. Middleware now sets Cache-Control: no-store, private and Pragma: no-cache for /api/. Tests cover authenticated/unauthenticated endpoints and preserve non-API headers. This is preventive hardening; do not describe it as an observed real-user data leak. Public static assets may remain cacheable.

## ZAP-40018 — SQL injection alert (triaged false positive for the reported case)

ZAP reported a high-risk, medium-confidence boolean SQL-injection alert on POST category name with `ZAP AND 1=1 -- ` versus `ZAP AND 1=2 -- `. The original alert is retained, not suppressed. Independent live replay on clean scanner-owned names returned201 for BOTH strings, storing each literally; repeating each returned400 duplicate-name validation. Three PostgreSQL regression cases inspect the database execution boundary and verify input is passed in query parameters, never concatenated into SQL, including a quote-bearing payload. Other users' categories remain unchanged. The category serializer uses ORM parameterized filtering/creation; no raw SQL path was found for this endpoint.

Conclusion: the reported predicate distinction was not reproduced; evidence supports a stateful create/duplicate-validation false positive for this case. This does not prove absence of SQL injection everywhere. Reproduction: `python3 security/reproduce_category_alert.py` after prepare_scan.py; evidence/category-alert-replay.json and test_zap_category_payload_is_bound_data. Do not label the original scanner output as zero high alerts.

## ZAP-100001 — unexpected HTML content type (accepted low finding)

The API scan also traverses the SPA root, missing routes and slash redirects, where HTML is expected from Nginx/Django. Unknown API routes use Django's generic404 HTML; valid API routes return JSON. This is an API error-format consistency limitation, with no sensitive exception details observed, not evidence of injection. Review if a strict all-JSON API contract is required. Informational4xx alerts reflect rejected scan payloads; no-store informational alerts confirm deliberate private-response policy.
