import { useEffect, useRef, cloneElement } from "react";
import { ArrowDownLeft, ArrowUpRight, Trash2, Pencil } from "lucide-react";
import { Link } from "react-router-dom";
export const money = (value) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    Number(value || 0),
  );
export const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Header({
  eyebrow = "YOUR MONEY, IN FOCUS",
  title,
  subtitle,
  action,
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
export function ErrorMessage({ error }) {
  return error ? (
    <div className="notice error" role="alert">
      {error.status === 403
        ? "You do not have permission to perform this action."
        : error.fields?.non_field_errors?.join(" ") ||
          error.message ||
          String(error)}
      {error.status === 400 && error.fields && (
        <ul>
          {Object.entries(error.fields)
            .filter(([key]) => !["detail", "non_field_errors"].includes(key))
            .map(([key, value]) => (
              <li key={key}>
                {key.replaceAll("_", " ")}:{" "}
                {Array.isArray(value) ? value.join(" ") : String(value)}
              </li>
            ))}
        </ul>
      )}
    </div>
  ) : null;
}
export function Field({ label, name, error, children, ...props }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children ? (
        cloneElement(children, {
          "aria-invalid": !!error,
          "aria-describedby": error ? `${name}-error` : undefined,
        })
      ) : (
        <input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
      )}{" "}
      {error && (
        <small id={`${name}-error`} className="field-error">
          {Array.isArray(error) ? error.join(" ") : String(error)}
        </small>
      )}
    </div>
  );
}
export function State({ resource, children }) {
  if (resource.loading)
    return (
      <div className="state" role="status">
        Loading your finances…
      </div>
    );
  if (resource.error)
    return (
      <div className="state">
        <ErrorMessage error={resource.error} />
        <button className="button secondary" onClick={resource.reload}>
          Try again
        </button>
      </div>
    );
  return children;
}
export function Empty({ title = "Nothing here yet", children }) {
  return (
    <div className="empty">
      <span className="empty-symbol">＋</span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Confirm({ item, onCancel, onConfirm, busy, error }) {
  const ref = useRef();
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2>Delete {item}?</h2>
      <p>This will permanently remove this record.</p>
      <ErrorMessage error={error} />
      <div className="actions">
        <button
          autoFocus
          className="button secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button className="button danger" disabled={busy} onClick={onConfirm}>
          {busy ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}
export function BudgetProgress({ budget }) {
  const p = budget.progress;
  return (
    <div className="budget-progress" data-testid="budget-progress">
      <div className="row">
        <strong>{budget.category_name}</strong>
        <span
          className={`badge ${p.status === "OVER_BUDGET" ? "red" : p.status === "REACHED" ? "amber" : "green"}`}
          data-testid={
            p.status === "OVER_BUDGET" ? "over-budget-warning" : undefined
          }
        >
          {p.status === "OVER_BUDGET"
            ? "Over budget"
            : p.status === "REACHED"
              ? "Budget reached"
              : "On track"}
        </span>
      </div>
      <div className="budget-amount">
        <strong>{money(p.spent)}</strong>
        <span> of {money(budget.amount)}</span>
      </div>
      <progress
        max="100"
        value={Math.min(100, Number(p.percentage))}
        aria-label={`${budget.category_name} budget used`}
        className={p.status.toLowerCase()}
      />
      <div className="row muted">
        <small>
          {Number(p.remaining) < 0
            ? `${money(-Number(p.remaining))} over`
            : `${money(p.remaining)} remaining`}
        </small>
        <small>{p.percentage}% used</small>
      </div>
      <small className="muted">
        {dateLabel(budget.start_date)} – {dateLabel(budget.end_date)}
      </small>
    </div>
  );
}
export function TransactionTable({ rows, onDelete, compact = false }) {
  if (!rows.length)
    return (
      <Empty title="No transactions found.">
        <p>Add a transaction or adjust your filters.</p>
      </Empty>
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Category</th>
            <th>Date</th>
            <th className="align-right">Amount</th>
            {!compact && <th className="align-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                <div className="transaction-name">
                  <span className={`transaction-icon ${t.type.toLowerCase()}`}>
                    {t.type === "INCOME" ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </span>
                  <div>
                    <strong>{t.description || t.category_name}</strong>
                    <small>{t.type === "INCOME" ? "Income" : "Expense"}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className="category-tag">{t.category_name}</span>
              </td>
              <td className="muted">{dateLabel(t.date)}</td>
              <td className={`align-right amount ${t.type.toLowerCase()}`}>
                {t.type === "INCOME" ? "+" : "−"}
                {money(t.amount)}
              </td>
              {!compact && (
                <td>
                  <div className="row end">
                    <Link
                      className="icon-button"
                      aria-label={`Edit ${t.description || t.category_name}`}
                      to={`/transactions/${t.id}/edit`}
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${t.description || t.category_name}`}
                      onClick={() => onDelete(t)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
