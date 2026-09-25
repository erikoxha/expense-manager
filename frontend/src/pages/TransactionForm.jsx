import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useResource } from "../hooks/useResource";
import { transactionService } from "../services/transactionService";
import { categoryService } from "../services/categoryService";
import { Header, State, Field, ErrorMessage } from "../components/UI";
function Editor({ categories, initial, id }) {
  const [values, setValues] = useState(initial),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const change = (e) =>
    setValues({
      ...values,
      [e.target.name]: e.target.value,
      ...(e.target.name === "type" ? { category: "" } : {}),
    });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        type: values.type,
        amount: values.amount,
        category: values.category,
        date: values.date,
        description: values.description,
      };
      if (id) await transactionService.update(id, body);
      else await transactionService.create(body);
      navigate("/transactions", {
        state: { notice: id ? "Transaction updated." : "Transaction added." },
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="card editor"
      data-testid="transaction-form"
      onSubmit={submit}
    >
      <ErrorMessage error={error} />
      <div className="form-grid">
        <Field label="Type" name="type" error={error?.fields.type}>
          <select id="type" name="type" value={values.type} onChange={change}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </Field>
        <Field
          label="Amount (€)"
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
        <Field label="Category" name="category" error={error?.fields.category}>
          <select
            id="category"
            name="category"
            required
            value={values.category}
            onChange={change}
          >
            <option value="">Select a category</option>
            {categories
              .filter((c) => c.type === values.type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <Field
          label="Date"
          name="date"
          type="date"
          required
          value={values.date}
          onChange={change}
          error={error?.fields.date}
        />
      </div>
      <Field
        label="Description"
        name="description"
        maxLength={500}
        value={values.description}
        onChange={change}
        placeholder="What was this for?"
        error={error?.fields.description}
      />
      <p className="muted">
        Missing a category? <Link to="/categories">Manage categories</Link>
      </p>
      <div className="actions">
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : id ? "Save changes" : "Add transaction"}
        </button>
        <Link className="button secondary" to="/transactions">
          Cancel
        </Link>
      </div>
    </form>
  );
}
export default function TransactionForm() {
  const { id } = useParams();
  const resource = useResource(
    async () => ({
      categories: await categoryService.all(),
      initial: id
        ? await transactionService.get(id)
        : {
            type: "EXPENSE",
            amount: "",
            category: "",
            description: "",
            date: new Date().toLocaleDateString("en-CA"),
          },
    }),
    [id],
  );
  return (
    <>
      <Header
        title={id ? "Edit transaction" : "Add a transaction"}
        subtitle="The small details make the big picture."
      />
      <State resource={resource}>
        {resource.data && (
          <Editor key={id || "new"} {...resource.data} id={id} />
        )}
      </State>
    </>
  );
}
