import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { budgetService } from "../services/budgetService";
import { categoryService } from "../services/categoryService";
import {
  Header,
  State,
  Field,
  ErrorMessage,
  Empty,
  Confirm,
  BudgetProgress,
} from "../components/UI";
const initial = { category: "", amount: "", start_date: "", end_date: "" };
export default function Budgets() {
  const resource = useResource(async () => ({
    budgets: await budgetService.all(),
    categories: await categoryService.all(),
  }));
  const [values, setValues] = useState(initial),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [deleteError, setDeleteError] = useState(null),
    [notice, setNotice] = useState("");
  const reset = () => {
    setValues(initial);
    setEditing(null);
    setError(null);
  };
  const change = (e) =>
    setValues({ ...values, [e.target.name]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) await budgetService.update(editing, values);
      else await budgetService.create(values);
      setNotice(editing ? "Budget updated." : "Budget created.");
      reset();
      resource.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try {
      await budgetService.remove(deleting.id);
      setDeleting(null);
      setNotice("Budget deleted.");
      resource.reload();
    } catch (e) {
      setDeleteError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        title="A plan for your spending."
        subtitle="Set your limits. Keep sight of your priorities."
      />
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      <State resource={resource}>
        {resource.data && (
          <div className="management-grid">
            <div className="budget-cards">
              {resource.data.budgets.length ? (
                resource.data.budgets.map((b) => (
                  <article className="card" key={b.id}>
                    <BudgetProgress budget={b} />
                    <div className="actions end">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${b.category_name} budget`}
                        onClick={() => {
                          setEditing(b.id);
                          setValues({
                            category: b.category,
                            amount: b.amount,
                            start_date: b.start_date,
                            end_date: b.end_date,
                          });
                          setError(null);
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${b.category_name} budget`}
                        onClick={() => {
                          setDeleting(b);
                          setDeleteError(null);
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <section className="card">
                  <Empty title="Make space for your goals">
                    <p>Create your first category budget.</p>
                  </Empty>
                </section>
              )}
            </div>
            <form
              className="card editor"
              data-testid="budget-form"
              onSubmit={submit}
            >
              <h2>{editing ? "Edit budget" : "New budget"}</h2>
              <ErrorMessage error={error} />
              <Field
                label="Expense category"
                name="category"
                error={error?.fields.category}
              >
                <select
                  id="category"
                  name="category"
                  required
                  value={values.category}
                  onChange={change}
                >
                  <option value="">Select a category</option>
                  {resource.data.categories
                    .filter((c) => c.type === "EXPENSE")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                label="Budget amount (€)"
                name="amount"
                type="number"
                min="0.01"
                max="9999999999.99"
                step="0.01"
                required
                value={values.amount}
                onChange={change}
                error={error?.fields.amount}
              />
              <Field
                label="Start date"
                name="start_date"
                type="date"
                required
                value={values.start_date}
                onChange={change}
                error={error?.fields.start_date}
              />
              <Field
                label="End date"
                name="end_date"
                type="date"
                min={values.start_date}
                required
                value={values.end_date}
                onChange={change}
                error={error?.fields.end_date}
              />
              <div className="actions">
                <button className="button" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : editing
                      ? "Save changes"
                      : "Create budget"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={reset}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </State>
      {deleting && (
        <Confirm
          item="budget"
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
          error={deleteError}
        />
      )}
    </>
  );
}
