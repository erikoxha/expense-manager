import { useState } from "react";
import { Pencil, Trash2, Tags } from "lucide-react";
import { useResource } from "../hooks/useResource";
import { categoryService } from "../services/categoryService";
import {
  Header,
  State,
  Field,
  ErrorMessage,
  Empty,
  Confirm,
} from "../components/UI";
export default function Categories() {
  const resource = useResource(() => categoryService.all());
  const [values, setValues] = useState({ name: "", type: "EXPENSE" }),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [deleteError, setDeleteError] = useState(null),
    [notice, setNotice] = useState("");
  const reset = () => {
    setValues({ name: "", type: "EXPENSE" });
    setEditing(null);
    setError(null);
  };
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) await categoryService.update(editing, values);
      else await categoryService.create(values);
      setNotice(editing ? "Category updated." : "Category created.");
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
      await categoryService.remove(deleting.id);
      setDeleting(null);
      setNotice("Category deleted.");
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
        title="Categories"
        subtitle="Organize your money in a way that makes sense to you."
      />
      {notice && (
        <p className="notice success" role="status">
          {notice}
        </p>
      )}
      <div className="management-grid">
        <section className="card">
          <State resource={resource}>
            {resource.data?.length ? (
              <div className="category-list">
                {resource.data.map((c) => (
                  <div className="category-row" key={c.id}>
                    <span
                      className={`transaction-icon ${c.type.toLowerCase()}`}
                    >
                      <Tags size={20} />
                    </span>
                    <div>
                      <strong>{c.name}</strong>
                      <small>
                        {c.type === "INCOME" ? "Income" : "Expense"}
                      </small>
                    </div>
                    <div className="actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${c.name}`}
                        onClick={() => {
                          setEditing(c.id);
                          setValues({ name: c.name, type: c.type });
                          setError(null);
                        }}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => {
                          setDeleting(c);
                          setDeleteError(null);
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="Start with a few categories">
                <p>Try groceries, transport, or salary.</p>
              </Empty>
            )}
          </State>
        </section>
        <form className="card editor" onSubmit={submit}>
          <h2>{editing ? "Edit category" : "New category"}</h2>
          <ErrorMessage error={error} />
          <Field
            label="Name"
            name="name"
            required
            maxLength={80}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            error={error?.fields.name}
          />
          <Field label="Type" name="type" error={error?.fields.type}>
            <select
              id="type"
              value={values.type}
              onChange={(e) => setValues({ ...values, type: e.target.value })}
            >
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
            </select>
          </Field>
          <div className="actions">
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create category"}
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
          <p className="muted">
            Categories in use cannot be deleted or switched to another type.
          </p>
        </form>
      </div>
      {deleting && (
        <Confirm
          item={`“${deleting.name}”`}
          onCancel={() => setDeleting(null)}
          onConfirm={remove}
          busy={busy}
          error={deleteError}
        />
      )}
    </>
  );
}
