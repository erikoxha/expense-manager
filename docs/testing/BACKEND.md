# Backend tests: execution and interpretation

Use Python 3.12 and Docker Desktop. Run from the repository root:

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements-test.lock
python scripts/init_testing.py
docker compose -f docker-compose.testing.yml up -d --build
python scripts/run_backend.py
```

The dedicated database is on localhost:55432, backend on 18000 and website on 18080. It uses a disposable tmpfs database, separate from normal demo data. Removing/stopping its database container can lose its data; recreate and seed when needed. Pytest creates its own `test_expense_testing` database, applies real migrations, and isolates test transactions. Do not point these tools at production.

`reports/backend/tests.html` lists test outcomes; `coverage-html/index.html` highlights executed/missed application lines and branches; `quality-gate.json` enforces separate >=90% statement and >=85% branch gates. `coverage.xml` is suitable for CI coverage tooling and `junit.xml` for test tooling. Raw reports are ignored; reviewed evidence is versioned under docs/testing/evidence. No external reporting account is required.

The database must allow creation of test databases. CI provides an isolated PostgreSQL service and explicitly sets port5432. The helper respects existing environment variables; check for old POSTGRES_* overrides if connection fails. Dependencies are locked in requirements-test.lock; requirements-test.txt describes direct constraints.

## What is actually tested

The requirements and case criteria are mapped in [PLAN.md](PLAN.md). Most API/service tests are integration tests using real Django serializers, JWT authentication, ORM and PostgreSQL. They are not isolated unit tests. Pure `calculate_budget_progress` tests cover financial arithmetic. Hypothesis runs up to 200 deterministic generated examples for each of two invariant properties: conservation/status and monotonic spending. Seven collected property/unit cases include parameterized boundary cases; 400 generated examples are not 400 separate pytest cases.

Fast test password hashing keeps fixtures inexpensive. A separate test explicitly verifies real PBKDF2 hashing; password validators remain active. Tests deliberately inject database errors to verify safe 409/500 responses. Category changes between validation and saving are controlled fault injection, not a concurrency stress test.

Examples to explain in a presentation:
- 0.00 is invalid, 0.01 is the minimum valid transaction, excessive decimal precision is rejected.
- Alice cannot read/update/delete Bob's object; also verify denied requests leave stored data unchanged.
- An expense on either budget boundary counts; the immediately surrounding dates do not.
- Amount minus spending equals remaining even when the budget is exceeded. Decimal arithmetic avoids float rounding.
- Logout requires an access token and the refresh token must belong to that same user.

Coverage omits only migrations and package initializers. WSGI bootstrap is not executed inside pytest and remains uncovered. Branch coverage measures instrumented Python decisions, not all business scenarios, paths, security threats or MC/DC.

To focus a run use `python scripts/run_backend.py tests/test_auth.py`; the global coverage gate will normally fail for a partial suite, which is expected. For focused debugging without the gate use `cd backend && python -m pytest tests/test_auth.py` with database environment configured. Always rerun the full gate before proposing integration.

See [RESULTS.md](RESULTS.md), [DEFECTS.md](DEFECTS.md) and [REVIEW-WALKTHROUGH.md](REVIEW-WALKTHROUGH.md).

The explicit ISP models, Each Choice Coverage scope, boundary representatives and test mappings are in [ISP.md](ISP.md).
