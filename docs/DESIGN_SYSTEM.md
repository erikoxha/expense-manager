# Design system

The product UI is named Ledger. Values live in `frontend/src/styles.css`.

| Token | Value |
| --- | --- |
| Primary/action | #087f72 |
| Secondary/sidebar | #122b39 |
| Background | #f4f7f8 |
| Surface | #ffffff |
| Text | #18313e |
| Muted | #657984 |
| Error | #b83c47 |
| Warning | #9b610e |
| Success | #087f57 |
| Border | #e2e9ec |
| Card radius | 14px |
| Button radius | 8px |
| Input radius | 7px |
| Base spacing token | 8px |
| Body typography | System sans-serif, 16px, 1.5 line height |

Layout: fixed 240px desktop sidebar, responsive navigation under 760px, card-based financial workspace. Forms use labels, visible focus, field-level messages, disabled busy buttons and semantic input types. Destructive actions use a native modal dialog with initial focus on Cancel and Escape cancellation. Charts include accessible descriptions and tabular/list data alternatives. No external web fonts or decorative images are required.

Stable selectors include `.button`, `.card`, `.field`, `.notice`, `.budget-progress`, `.transaction-name`, and `data-testid` values `login-button`, `register-button`, `transaction-form`, `budget-form`, `budget-progress`, `over-budget-warning`. Prefer accessible role/name selectors in future tests.
