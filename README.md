# Ledger — Personal Expense & Budget Manager

A full-stack university Software Quality & Testing project using **Django REST Framework, PostgreSQL, JWT, React, JavaScript, React Router and Recharts**. The application is implemented first; automated testing tools and suites will be added in a separate phase selected by the team.

## Project structure

```text
expense-manager/
├── backend/
│   ├── manage.py
│   ├── config/       # settings, URLs and structured API errors
│   ├── expenses/     # models, validation, API views, calculation services, migrations, seed command
│   ├── users/        # Django user model, registration and profile
│   └── tests/        # reserved, no automated tests yet
├── frontend/
│   ├── src/
│   │   ├── components/ # layout, charts, accessible shared controls
│   │   ├── pages/      # authentication, dashboard and CRUD workflows
│   │   ├── services/   # API transport, token refresh, resource services
│   │   ├── hooks/      # authentication and loading/error state
│   │   └── tests/      # reserved
│   └── ...
├── e2e/
├── load-tests/
├── security/
├── docs/
├── docker-compose.yml
└── README.md
```

## Requirements

Recommended: Docker Desktop (running) with Compose. Native development: Python **3.12+**, Node **22+**, npm, and PostgreSQL **16+**. SQLite is not used.

## Quick start with Docker

From the repository root:

```sh
cp .env.example .env
# Edit .env: set DJANGO_SECRET_KEY, POSTGRES_PASSWORD and DEMO_PASSWORD.
# Generate a secret with: python3 -c 'import secrets; print(secrets.token_urlsafe(50))'
docker compose up --build -d
# The backend applies committed migrations before starting.
docker compose exec backend python manage.py seed_demo
```

Open **http://localhost:8080**. Sign in as `demo` or `demo_other` using the `DEMO_PASSWORD` you set, or register a fresh account. Seeding skips an existing demo username and does not overwrite its data. Demo accounts have separate but equivalent records, with budgets below, exactly at, and above their limits. Seed dates use the current month.

```sh
docker compose logs -f backend
docker compose exec backend python manage.py migrate
docker compose stop
```

PostgreSQL data persists in the `postgres_data` volume. Do not remove the volume unless you intentionally want to erase local data. Host ports bind to loopback only. For a future ZAP container, join the Compose network and target `http://frontend` or `http://backend:8000`; no scan is configured or claimed yet.

## Native development

Create `.env` as above. Start the database using `docker compose up -d db`, or create a PostgreSQL database and user matching your environment values.

```sh
python3.12 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.lock
set -a
. ./.env
set +a
export POSTGRES_HOST=127.0.0.1
python backend/manage.py migrate
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8000
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` to Django at port 8000. For a frontend production build use `npm run build`; the Docker frontend serves this build with Nginx, SPA routing and an API proxy.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Required random signing secret, never commit the real value |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database name, account and required password |
| `POSTGRES_HOST`, `POSTGRES_PORT` | Database host (`db` in Compose, `127.0.0.1` native) and port (5432) |
| `DEBUG` | `true` only for local development; default is false |
| `ALLOWED_HOSTS` | Comma-separated exact backend hostnames |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins; no wildcard |
| `SECURE_SSL_REDIRECT` | Enable behind a correctly configured HTTPS deployment |
| `DEMO_PASSWORD` | Required by the optional seed command |
| `VITE_API_BASE_URL` | Optional build-time frontend API prefix; defaults to `/api` |

The example environment is for local development. For Internet deployment configure HTTPS/reverse proxy, `DEBUG=false`, correct hosts/origins, secure environment secrets, logging and database backups. Production secure cookies and security headers are configured; HTTPS redirection/HSTS are enabled with `SECURE_SSL_REDIRECT=true`. Configure TLS forwarding explicitly for your chosen host. This repository does not provision a public production service.

## Architecture and business rules

See [architecture and decisions](docs/ARCHITECTURE.md), [API reference](docs/API.md), [design system](docs/DESIGN_SYSTEM.md) and [submission checklist](docs/SUBMISSION.md).

- Every private API query is scoped to the authenticated user. Ownership cannot be supplied or changed by a client. Other users' IDs return 404; foreign category references return 400.
- Amounts are positive `Decimal(12,2)`: **0.01 to 9,999,999,999.99**. Excess precision is rejected, not rounded silently. JSON money is serialized as decimal strings.
- Transaction type must match category type. Budget categories must be expenses.
- Category names are trimmed and unique case-insensitively per user and type. Referenced categories cannot be deleted or have their type changed.
- Budgets include both date boundaries. Overlapping budgets are allowed and each independently counts matching expenses. Budget percentage may exceed 100%; only the visual progress bar is capped.
- Income minus expenses is the balance. Dashboard totals are all-time. Every total and budget status is calculated by the backend.
- Display currency is EUR. No conversion or multi-currency accounting is implemented.

## Authentication

Register, then log in with username and password. Passwords use Django hashing and password validators. Access JWTs expire after 5 minutes; refresh JWTs after one day. Refresh tokens rotate and used refresh tokens are blacklisted. Logout revokes the refresh token. Already-issued access tokens remain valid until their short expiration.

Tokens are stored in `sessionStorage` for tab-scoped sessions, with a shared in-flight refresh request to prevent concurrent rotation. This keeps the API straightforward to test but means an XSS vulnerability could expose tokens. The production Nginx configuration applies a same-origin Content Security Policy. Consider HTTP-only cookie authentication with CSRF protection if a later production threat model requires it. Closing the tab ends the browser session.

## API overview

Public: `POST /api/auth/register/`, `/api/auth/login/`, `/api/auth/refresh/`.

Authenticated: `GET /api/auth/me/`, `POST /api/auth/logout/`; CRUD at `/api/categories/`, `/api/transactions/`, `/api/budgets/`; and read-only `/api/statistics/{summary,expenses-by-category,income-by-category,monthly,budgets}/`.

Lists use 25-record pagination. Transaction filters combine `type`, `category` (ID or name), `start_date`, `end_date`, `min_amount`, `max_amount`, and `search`. Details, payloads, responses and status codes are in [docs/API.md](docs/API.md).

## Testing status and next phase

No pytest, React Testing Library, Vitest, MSW, Playwright, k6 or ZAP suites are implemented yet. Empty testing locations are deliberate. Build/runtime verification is separate from the future graded testing work. See [verification record](docs/VERIFICATION.md) for what was actually run and any remaining limitations.

Potential test boundaries: decimal validation, invalid/missing dates, category ownership/type, duplicate names, CRUD authorization, combined filters, token expiry/rotation, inclusive budget periods and three budget states. Frontend services support fetch interception by MSW; components have semantic labels and stable test IDs for core forms, sign-in and budget states.

The course submission is not complete until the team implements and documents selected testing techniques, captures results, fixes/retests defects, and produces the final PDF with team index numbers and repository links.
