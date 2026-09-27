# Input Space Partitioning and test traceability

ISP is the test-design technique; pytest is the Python execution framework. JUnit is a Java framework and is not used here. The generated junit.xml is a compatible result format, not evidence that Java/JUnit tests ran.

This document makes the existing test selection explicit after implementation. It does not claim the detailed partition model was written before the tests. The original plan's partitions and boundary goals are in PLAN.md.

## Criterion and scope

We use **Each Choice Coverage (ECC) for the finite characteristics and blocks listed below**: each listed block has at least one concrete exercised representative. Most invalid-request cases change one field from a valid base request, so unrelated failures do not mask the expected validation. Boundary-value cases supplement ECC within numeric/string/date blocks.

These are separate, operation-specific input models, not one Cartesian product. Blocks within a characteristic are mutually exclusive under the stated classification order. Missing or invalid parent values make dependent characteristics inapplicable. This mapping covers the selected scalar inputs and resource relationships; arbitrary JSON types, all Unicode/date formats, and every possible request sequence are outside this model. No pairwise, all-combinations, formal Base Choice Coverage, MC/DC or exhaustive security claim is made. Python branch coverage is a separate structural metric.

All references below are exact function names under backend/tests/. Parameterized rows are independently collected pytest cases; multiple assertions in a workflow are not counted as separate tests. The recorded full-suite run in evidence/backend-final.txt contains these tests. ISP documentation adds no new test cases.

## Transaction creation base request

Alice has a valid access JWT and owns an EXPENSE category. Base JSON: category=that ID, type=EXPENSE, amount="12.34", date="2026-09-15", description="Food shop". Successful POST returns201, stores Alice as owner, and serializes exact decimal money. Rejected POST returns400; amount/reference rejection tests also assert that no transaction was created.

### Amount characteristic

Classify in table order: absent, null, blank, nonnumeric, nonfinite, excessive fractional precision, then magnitude for finite values with at most two fractional places. This avoids counting "0.001" simultaneously as precision and below-minimum partitions.

| Block | Representative | Expected | Existing test in test_transactions.py |
| --- | --- | --- | --- |
| A1 absent | omit amount |400, amount field error |test_missing_fields[amount] |
| A2 null |null |400, amount field error |test_amount_partitions |
| A3 blank |"" |400 |test_amount_partitions |
| A4 nonnumeric string |"abc" |400 |test_amount_partitions |
| A5 nonfinite numeric text |"NaN", "Infinity" |400 |test_amount_partitions |
| A6 more than two fractional digits |"0.001" |400, no silent rounding |test_amount_partitions |
| A7 negative finite amount |"-0.01" |400 |test_amount_partitions |
| A8 zero |"0" |400 |test_amount_partitions |
| A9 valid positive finite amount through maximum |"0.01", "12.34", "9999999999.99" |201, exact amount |test_amount_partitions |
| A10 above maximum |"10000000000" |400 |test_amount_partitions |

With two-decimal representable values there is no positive value below0.01; extra precision is A6. A9 includes lower boundary, interior and upper boundary representatives. ECC does not by itself require all three; boundary testing adds them.

### Transaction date characteristic

| Block | Representative | Expected | Existing test in test_transactions.py |
| --- | --- | --- | --- |
| D1 absent |omit date |400 |test_missing_fields[date] |
| D2 null |null |400 |test_invalid_dates |
| D3 blank |"" |400 |test_invalid_dates |
| D4 malformed/non-ISO text |"25/09/2026", "invalid" |400 |test_invalid_dates |
| D5 ISO-shaped impossible date |"2026-02-30" |400 |test_invalid_dates |
| D6 valid calendar date |"2026-09-15" |201 |test_full_crud_and_server_owned_fields |

### Category reference characteristic

Hold transaction type=EXPENSE and category IDs as integers when present. Foreign ownership takes precedence over type for classification.

| Block | Representative | Expected | Existing test in test_transactions.py |
| --- | --- | --- | --- |
| R1 absent |omit category |400 |test_missing_fields[category] |
| R2 nonexistent |999999 with no corresponding row |400, no write |test_category_references[nonexistent] |
| R3 foreign user |Bob's category ID |400, no write |test_category_references[foreign] |
| R4 own but wrong type |Alice's INCOME category |400, no write |test_category_references[wrong-type] |
| R5 own and matching type |Alice's EXPENSE category |201 |test_full_crud_and_server_owned_fields |

Null/noninteger reference representations are outside this reference-relationship model. Separate PATCH tests verify changing only type or only category is rejected, while changing both consistently succeeds: test_patch_category_type_consistency.

### Description length characteristic

String values only; the normal base request supplies the interior representative.

| Block | Representative | Expected | Existing test in test_transactions.py |
| --- | --- | --- | --- |
| L1 empty |0 characters |201 |test_description_boundaries |
| L2 interior |"Food shop" |201 and readable value |test_full_crud_and_server_owned_fields |
| L3 maximum |500 characters |201 |test_description_boundaries |
| L4 above maximum |501 characters |400 |test_description_boundaries |

## Budget input and calculation models

### Date ordering on budget creation

Both dates are valid ISO calendar dates; other fields are valid. Invalid or missing dates are covered separately by test_budget_boundaries and test_budget_missing_fields.

| Block | Start / end | Expected | Existing test in test_categories_budgets.py |
| --- | --- | --- | --- |
| O1 start before end |2026-09-01 / 2026-09-30 |201 |test_budget_boundaries (valid amount cases) |
| O2 start equals end |2026-09-01 / 2026-09-01 |201, single-day budget allowed |test_budget_boundaries |
| O3 start after end |2026-10-01 / 2026-09-30 |400 |test_budget_boundaries |

### Spending relative to a positive budget

Amount=100.00; spending is a nonnegative Decimal. test_financial_services.py::test_budget_decision_boundaries checks all returned fields, not only the label.

| Block | Spending | Remaining / percentage / state |
| --- | --- | --- |
| S1 zero |0.00 |100.00 / 0.00 / WITHIN_BUDGET |
| S2 positive below budget |99.99 |0.01 / 99.99 / WITHIN_BUDGET |
| S3 equal to budget |100.00 |0.00 / 100.00 / REACHED |
| S4 above budget |100.01 |-0.01 / 100.01 / OVER_BUDGET |

### Expense date relative to a nonzero-length budget period

Period2026-09-01 through2026-09-30, correct owner/category/type.

| Block | Date | Contribution | Existing test in test_financial_services.py |
| --- | --- | --- | --- |
| T1 before start |2026-08-31 |excluded |test_budget_inclusive_dates_and_owner_category_scope |
| T2 on start |2026-09-01 |included |same test |
| T3 strictly inside |2026-09-15 |included |test_budget_decision_boundaries, fixture default |
| T4 on end |2026-09-30 |included |test_budget_inclusive_dates_and_owner_category_scope |
| T5 after end |2026-10-01 |excluded |same test |

The inclusive-date test uses10 at start and20 at end,500 outside each boundary, plus foreign-user and wrong-category income records; the expected total is exactly30. This is combined aggregation evidence, not one independent test per date block. A zero-length budget has no strictly-inside block and is handled by O2.

## Access and ownership models

### Access credentials on a private endpoint

Malformed includes the representative invalid token string; this model does not enumerate all cryptographic failure modes.

| Block | Representative | Expected | Existing test in test_auth.py |
| --- | --- | --- | --- |
| J1 absent |no Authorization header |401 |test_invalid_access[absent] |
| J2 malformed |Bearer bad |401 |test_invalid_access[malformed] |
| J3 expired |properly signed token expired ten minutes ago |401 |test_invalid_access[expired] |
| J4 valid |fresh token from actual login/refresh |200 profile for matching user |test_login_profile_refresh_rotation_logout |

### Existing resource ownership

Authenticated Alice; target exists. For each of transaction/category/budget, own versus foreign ownership is checked across GET/PATCH/PUT/DELETE. Own behavior is200 for read/update and204 for deletion; foreign behavior is404 without modification. Here the small ownership × method combination set is covered, but this does not imply combination coverage across all other models.

| Resource | Own block reference | Foreign block reference |
| --- | --- | --- |
| Transaction |test_transactions.py::test_full_crud_and_server_owned_fields |test_transactions.py::test_other_users_transaction_hidden, parameterized methods |
| Category |test_categories_budgets.py::test_category_crud_and_normalization |test_categories_budgets.py::test_foreign_category_hidden, parameterized methods |
| Budget |test_categories_budgets.py::test_budget_crud_and_partial_date_validation |test_categories_budgets.py::test_foreign_budget_hidden, parameterized methods |

Logout has an additional refresh-ownership decision: own valid refresh=200 and revoked, another user's valid refresh=403 and remains usable. See test_auth.py::test_login_profile_refresh_rotation_logout and test_logout_cannot_revoke_another_account. Missing access=401 even with a valid refresh: test_logout_requires_authenticated_access. These cases found two actual defects; see DEFECTS.md.

## How to demonstrate ISP

Pick A9 versus A8: explain the valid base request, replace only amount with0, predict400 before running it, and show the amount-specific error/no-write assertion. Then show why0.01 and the maximum supplement the valid block with boundary values. Explain that passing all listed blocks supports ECC for this defined model, not every possible input or combination.

Run the full suite with `python scripts/run_backend.py`; setup is in BACKEND.md. Read the real pytest outcomes and separate coverage gates rather than treating this traceability document as an execution report. New failures require updating evidence; never change expected business rules just to pass.
