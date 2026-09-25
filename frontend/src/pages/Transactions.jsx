import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { transactionService } from "../services/transactionService";
import { categoryService } from "../services/categoryService";
import {
  Header,
  State,
  Field,
  TransactionTable,
  Confirm,
  ErrorMessage,
} from "../components/UI";
const initial = {
  search: "",
  type: "",
  category: "",
  start_date: "",
  end_date: "",
  min_amount: "",
  max_amount: "",
};
export default function Transactions() {
  const location = useLocation();
  const [draft, setDraft] = useState(initial),
    [filters, setFilters] = useState(initial),
    [page, setPage] = useState(1),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [notice, setNotice] = useState(location.state?.notice || "");
  const resource = useResource(
    () => transactionService.list({ ...filters, page }),
    [JSON.stringify(filters), page],
  );
  const cats = useResource(() => categoryService.all());
  const change = (e) => setDraft({ ...draft, [e.target.name]: e.target.value });
  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await transactionService.remove(deleting.id);
      setDeleting(null);
      setNotice("Transaction deleted.");
      if (resource.data.results.length === 1 && page > 1) setPage(page - 1);
      else resource.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        title="Transactions"
        subtitle="Every entry, all in one place."
        action={
          <Link className="button" to="/transactions/new">
            <Plus size={18} />
            Add transaction
          </Link>
        }
      />
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      <section className="card">
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setFilters({ ...draft });
          }}
        >
          <Field
            label="Search descriptions"
            name="search"
            value={draft.search}
            onChange={change}
            placeholder="Search transactions…"
          />
          <Field label="Type" name="type">
            <select id="type" name="type" value={draft.type} onChange={change}>
              <option value="">All types</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
            </select>
          </Field>
          <Field label="Category" name="category">
            <select
              id="category"
              name="category"
              value={draft.category}
              onChange={change}
            >
              <option value="">All categories</option>
              {cats.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.type.toLowerCase()}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="From date"
            name="start_date"
            type="date"
            value={draft.start_date}
            onChange={change}
          />
          <Field
            label="To date"
            name="end_date"
            type="date"
            value={draft.end_date}
            onChange={change}
          />
          <Field
            label="Minimum (€)"
            name="min_amount"
            type="number"
            min="0"
            step="0.01"
            value={draft.min_amount}
            onChange={change}
          />
          <Field
            label="Maximum (€)"
            name="max_amount"
            type="number"
            min="0"
            step="0.01"
            value={draft.max_amount}
            onChange={change}
          />
          <div className="actions">
            <button className="button" type="submit">
              <Search size={16} />
              Apply
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setDraft(initial);
                setFilters(initial);
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </form>
        <ErrorMessage error={cats.error} />
      </section>
      <section className="card">
        <State resource={resource}>
          {resource.data && (
            <>
              <div className="section-heading">
                <h2>All transactions</h2>
                <span className="muted">{resource.data.count} records</span>
              </div>
              <TransactionTable
                rows={resource.data.results}
                onDelete={(t) => {
                  setDeleting(t);
                  setError(null);
                }}
              />
              <div className="pagination">
                <button
                  className="button secondary"
                  disabled={!resource.data.previous}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>Page {page}</span>
                <button
                  className="button secondary"
                  disabled={!resource.data.next}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </State>
      </section>
      {deleting && (
        <Confirm
          item="transaction"
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
          error={error}
        />
      )}
    </>
  );
}
