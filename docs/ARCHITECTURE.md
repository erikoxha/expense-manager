# Architecture and implementation decisions

## Layers

React pages compose reusable controls and charts. Pages call dedicated services through a single fetch transport. Authentication and loading/error logic are reusable hooks. React Router protects all finance routes. Vite proxies the API during development; Nginx does so in Docker.

Django REST Framework routes requests into serializers and user-scoped viewsets. Serializers validate inputs and foreign category ownership. Calculation services contain aggregation logic, using Django ORM and Decimal. PostgreSQL persists records and enforces foreign keys, positive amounts, ordered budget dates, category type values and category uniqueness. Model migrations are committed.

## Schema

- `User`: Django AbstractUser, unique email, password hash; `created_at` exposes `date_joined`.
- `Category`: user FK, name (80 chars), INCOME/EXPENSE type, created_at. Case-insensitive unique constraint on name + user + type.
- `Transaction`: user/category FKs, type, Decimal amount, optional description (500 chars), date, timestamps. Indexes on user/date and user/category/date. Positive amount and valid type constraints.
- `Budget`: user/category FKs, Decimal amount, start/end date, timestamps. Index on user/start/end. Positive amount and ordered dates constraints.

Cross-table category type/ownership rules are enforced at the API boundary; direct raw database writes or unmanaged ORM writes must not bypass this boundary. Category deletion uses PROTECT. User accounts are not deletable through this API.

## Clarifications

Money is EUR, with a two-decimal currency unit and a minimum of 0.01. Dates use YYYY-MM-DD and inclusive budget endpoints. Future transaction dates are allowed. Negative balances are allowed. Budget overlaps are allowed. All-time summary statistics are distinct from user-filtered transaction lists. Monthly chart rows exist for months with transactions.

Private-object misses return 404 rather than confirming another user's object exists. Duplicate names return validation errors; concurrent uniqueness conflicts return 409. Category ID is recommended for filtering; names consisting only of digits are interpreted as IDs.

## Deferred scope

No scheduled payments, bank integrations, email verification, password reset, currency conversion or account deletion were requested. Testing framework choice, automated suites, performance thresholds, security scans and final university PDF are a subsequent phase.
