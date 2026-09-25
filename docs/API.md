# API reference

Base URL: `/api`. JSON request and response bodies. Authenticated endpoints require `Authorization: Bearer <access>`. All IDs and timestamps are read-only. User ownership is derived from JWT authentication and is never a writable API field.

## Authentication

| Method and path | Authentication | Body | Successful response |
| --- | --- | --- | --- |
| POST `/auth/register/` | None | `{ "username":"alex", "email":"alex@example.com", "password":"a-strong-password" }` | 201: `{id,username,email,created_at}` |
| POST `/auth/login/` | None | `{ "username":"alex", "password":"a-strong-password" }` | 200: `{access,refresh}` |
| POST `/auth/refresh/` | Refresh token | `{ "refresh":"…" }` | 200: new `{access,refresh}`; old refresh blacklisted |
| POST `/auth/logout/` | Access token | `{ "refresh":"…" }` | 200: `{}`; refresh blacklisted |
| GET `/auth/me/` | Access token | None | 200: `{id,username,email,created_at}` |

Registration validates username, email uniqueness and Django password rules. Invalid fields return 400; failed login and expired/invalid JWTs return 401. Anonymous requests are limited to 60/minute (429), using Django's default local cache; use a shared cache for multi-worker production rate limiting.

## CRUD resources (all authenticated)

The table applies independently to `/categories/`, `/transactions/`, and `/budgets/`.

| Method | URL | Body | Success |
| --- | --- | --- | --- |
| GET | `/resource/` | None | 200: paginated list |
| POST | `/resource/` | Required resource fields below | 201: created resource |
| GET | `/resource/{id}/` | None | 200: resource |
| PUT | `/resource/{id}/` | All required resource fields | 200: updated resource |
| PATCH | `/resource/{id}/` | Only changed fields | 200: updated resource |
| DELETE | `/resource/{id}/` | None | 204: no body |

List response: `{ "count": 42, "next": "…?page=2", "previous": null, "results": […] }`. Page size is 25; use `?page=2`.

### Categories

Request: `{ "name":"Groceries", "type":"EXPENSE" }`.

Response: `{ "id":1, "name":"Groceries", "type":"EXPENSE", "created_at":"2026-09-25T12:00:00Z" }`.

Name is required, nonblank and at most 80 characters. Type is INCOME or EXPENSE. Duplicate name/type per user returns 400, case-insensitively. Changing type while referenced returns 400. Deleting a referenced category returns 409. Concurrent uniqueness conflicts return 409.

### Transactions

Request: `{ "category":1, "type":"EXPENSE", "amount":"45.90", "description":"Weekly groceries", "date":"2026-09-25" }`.

Response adds `id`, `category_name`, `created_at`, `updated_at` to these fields. Description is optional (max 500 characters). All other request fields are required. Amount must have at most 12 total digits, at most 2 decimal places and be positive. Category must be owned by the caller and match type. Invalid/missing fields, nonexistent or foreign category IDs, wrong category type and invalid dates return 400.

Filters apply only to GET collection requests, not object retrieval:

| Parameter | Value |
| --- | --- |
| `type` | INCOME or EXPENSE |
| `category` | Owned category ID, or case-insensitive name (numeric values interpreted as IDs) |
| `start_date`, `end_date` | YYYY-MM-DD, inclusive |
| `min_amount`, `max_amount` | Nonnegative Decimal, inclusive |
| `search` | Case-insensitive description substring |
| `page` | 1-based page number |

Example: `/transactions/?type=EXPENSE&category=1&start_date=2026-09-01&end_date=2026-09-30&min_amount=10.00&search=groceries`.

Invalid filter values or reversed ranges return 400. An unknown category filter yields an empty list. Records are ordered by descending date, then descending ID.

### Budgets

Request: `{ "category":1, "amount":"400.00", "start_date":"2026-09-01", "end_date":"2026-09-30" }`.

Response adds `id`, `category_name`, `created_at`, `updated_at`, and:

```json
{"progress":{"spent":"180.00","remaining":"220.00","percentage":"45.00","status":"WITHIN_BUDGET"}}
```

All four request fields are required. Only owned EXPENSE categories are accepted. Start must be on/before end. Amount rules match transactions. All invalid fields return 400. Overlapping periods are permitted. Spending is the sum of expenses for this owner/category over the inclusive period. Status is WITHIN_BUDGET, REACHED or OVER_BUDGET. Remaining can be negative and percentage can exceed 100.

## Statistics (all authenticated, GET, no request body)

| URL | 200 response |
| --- | --- |
| `/statistics/summary/` | `{ "income":"3650.00", "expenses":"1455.00", "balance":"2195.00", "transaction_count":7 }` |
| `/statistics/expenses-by-category/` | `[{ "category":1, "name":"Groceries", "amount":"180.00" }]` |
| `/statistics/income-by-category/` | Same shape, income only |
| `/statistics/monthly/` | `[{ "month":"2026-09", "income":"3650.00", "expenses":"1455.00" }]` |
| `/statistics/budgets/` | Unpaginated list of own budgets with progress |

Empty totals are zero; category/monthly/budget lists can be empty. Statistics always describe the caller; no user ID selector exists. Summary/category/monthly endpoints are all-time. Budget stats use each budget's period.

## Errors

Handled API errors have an `error` message and, where applicable, `fields` with original DRF details:

```json
{"error":"Please check the submitted fields.","fields":{"amount":["Ensure this value is greater than or equal to 0.01."]}}
```

- 400: invalid field, missing field, incompatible category, invalid filter/range.
- 401: missing/invalid/expired access token or invalid refresh credentials.
- 403: permission denied where applicable (frontend handles mocked 403 too).
- 404: missing resource, other user's resource, invalid pagination page.
- 405: unsupported HTTP method.
- 409: protected category deletion or database uniqueness/constraint conflict.
- 429: anonymous request throttling.
- 500: unexpected server failure; frontend displays a generic server-error message. Detailed exception data is not exposed with DEBUG=false.

Resource IDs in examples are illustrative. Use IDs from the logged-in user's actual API responses.
