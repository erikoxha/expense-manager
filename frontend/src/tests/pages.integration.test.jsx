import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import Layout from "../components/Layout";
import Budgets from "../pages/Budgets";
import Categories from "../pages/Categories";
import Dashboard from "../pages/Dashboard";
import Statistics from "../pages/Statistics";
import TransactionForm from "../pages/TransactionForm";
import Transactions from "../pages/Transactions";
import { apiOrigin, server } from "./server";

const profile = { id: 4, username: "page-test", email: "page@example.test" };
const page = (results) => ({ count: results.length, next: null, previous: null, results });
const categories = [
  { id: 2, name: "Food", type: "EXPENSE" },
  { id: 3, name: "Salary", type: "INCOME" },
];
const transaction = {
  id: 11,
  type: "EXPENSE",
  amount: "18.50",
  category: 2,
  category_name: "Food",
  date: "2026-09-20",
  description: "Lunch",
};
const budget = {
  id: 8,
  category: 2,
  category_name: "Food",
  amount: "200.00",
  start_date: "2026-09-01",
  end_date: "2026-09-30",
  progress: { spent: "38.00", remaining: "162.00", percentage: 19, status: "ON_TRACK" },
};

function renderPage(path, element, routePath = path) {
  sessionStorage.setItem("ledger.session", JSON.stringify({ access: "test-access", refresh: "test-refresh" }));
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path={routePath} element={element} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/login" element={<h1>Sign in required</h1>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function authHandler() {
  return http.get(`${apiOrigin}/api/auth/me/`, () => HttpResponse.json(profile));
}

describe("transaction and budget pages with MSW", () => {
  it("creates and edits a category, refreshing the visible list each time", async () => {
    const user = userEvent.setup();
    let records = [];
    let created;
    let updated;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(records))),
      http.post(`${apiOrigin}/api/categories/`, async ({ request }) => {
        created = await request.json();
        records = [{ id: 19, ...created }];
        return HttpResponse.json(records[0], { status: 201 });
      }),
      http.patch(`${apiOrigin}/api/categories/19/`, async ({ request }) => {
        updated = await request.json();
        records = [{ id: 19, ...updated }];
        return HttpResponse.json(records[0]);
      }),
    );
    renderPage("/categories", <Categories />);

    expect(await screen.findByText("Start with a few categories")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Groceries");
    await user.click(screen.getByRole("button", { name: "Create category" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Category created.");
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(created).toEqual({ name: "Groceries", type: "EXPENSE" });

    await user.click(screen.getByRole("button", { name: "Edit Groceries" }));
    expect(screen.getByRole("heading", { name: "Edit category" })).toBeInTheDocument();
    const name = screen.getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Food");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Category updated.");
    expect(await screen.findByText("Food")).toBeInTheDocument();
    expect(updated).toEqual({ name: "Food", type: "EXPENSE" });
  });

  it("loads the dashboard totals and empty chart and budget states", async () => {
    const summary = { balance: "0.00", income: "0.00", expenses: "0.00", transaction_count: 0 };
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/statistics/summary/`, () => HttpResponse.json(summary)),
      http.get(`${apiOrigin}/api/statistics/monthly/`, () => HttpResponse.json([])),
      http.get(`${apiOrigin}/api/statistics/expenses-by-category/`, () => HttpResponse.json([])),
      http.get(`${apiOrigin}/api/statistics/budgets/`, () => HttpResponse.json([])),
      http.get(`${apiOrigin}/api/statistics/income-by-category/`, () => HttpResponse.json([])),
      http.get(`${apiOrigin}/api/transactions/`, () => HttpResponse.json(page([]))),
    );
    renderPage("/dashboard", <Dashboard />);

    expect(await screen.findByRole("heading", { name: "A clearer picture, page-test." })).toBeInTheDocument();
    expect(await screen.findByText("Current balance")).toBeInTheDocument();
    expect(screen.getByText("Total income")).toBeInTheDocument();
    expect(screen.getByText("Total expenses")).toBeInTheDocument();
    expect(screen.getByText("All your recorded activity")).toBeInTheDocument();
    expect(screen.getByText("Your timeline starts here")).toBeInTheDocument();
    expect(screen.getByText("Give your spending a plan")).toBeInTheDocument();
    expect(screen.getByText("No income yet")).toBeInTheDocument();
  });

  it("loads statistics summaries and all three empty breakdown states", async () => {
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/statistics/summary/`, () => HttpResponse.json({ balance: "25.00" })),
      http.get(`${apiOrigin}/api/statistics/monthly/`, () => HttpResponse.json([])),
      http.get(`${apiOrigin}/api/statistics/income-by-category/`, () => HttpResponse.json([])),
      http.get(`${apiOrigin}/api/statistics/expenses-by-category/`, () => HttpResponse.json([])),
    );
    renderPage("/statistics", <Statistics />);

    expect(await screen.findByRole("heading", { name: "The bigger picture." })).toBeInTheDocument();
    expect(await screen.findByText("Balance €25.00")).toBeInTheDocument();
    expect(screen.getByText("Your timeline starts here")).toBeInTheDocument();
    expect(screen.getByText("No expenses yet")).toBeInTheDocument();
    expect(screen.getByText("No income yet")).toBeInTheDocument();
  });

  it("applies and resets transaction filters, then renders the matching result", async () => {
    const user = userEvent.setup();
    const searches = [];
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.get(`${apiOrigin}/api/transactions/`, ({ request }) => {
        const url = new URL(request.url);
        searches.push(url.searchParams.get("search"));
        return HttpResponse.json(page(url.searchParams.get("search") ? [transaction] : []));
      }),
    );
    renderPage("/transactions", <Transactions />);

    expect(await screen.findByText("No transactions found.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search descriptions"), "Lunch");
    await user.selectOptions(screen.getByLabelText("Type"), "EXPENSE");
    await user.selectOptions(screen.getByLabelText("Category"), "2");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("1 records")).toBeInTheDocument();
    expect(searches).toContain("Lunch");

    await user.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() => expect(searches.at(-1)).toBeNull());
    expect(screen.getByLabelText("Search descriptions")).toHaveValue("");
  });

  it("shows category validation feedback and permits retrying a failed deletion", async () => {
    const user = userEvent.setup();
    let createAttempts = 0;
    let deleteAttempts = 0;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.post(`${apiOrigin}/api/categories/`, () => {
        createAttempts += 1;
        return HttpResponse.json(
          { fields: { name: ["A category with this name already exists."] } },
          { status: 400 },
        );
      }),
      http.delete(`${apiOrigin}/api/categories/2/`, () => {
        deleteAttempts += 1;
        if (deleteAttempts === 1) {
          return HttpResponse.json({ error: "Category is in use." }, { status: 400 });
        }
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage("/categories", <Categories />);

    expect(await screen.findByText("Food")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Name"), "Food");
    await user.click(screen.getByRole("button", { name: "Create category" }));
    expect(await screen.findByText("A category with this name already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(createAttempts).toBe(1);

    await user.click(screen.getByRole("button", { name: "Delete Food" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Category is in use.");

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Category deleted.");
    expect(deleteAttempts).toBe(2);
  });

  it("moves between transaction pages and deletes the last row on a later page", async () => {
    const user = userEvent.setup();
    const second = { ...transaction, id: 12, description: "Coffee" };
    let deletedId;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.get(`${apiOrigin}/api/transactions/`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("page") === "2") {
          return HttpResponse.json({ count: 2, next: null, previous: "?page=1", results: [second] });
        }
        return HttpResponse.json({ count: 2, next: "?page=2", previous: null, results: [transaction] });
      }),
      http.delete(`${apiOrigin}/api/transactions/12/`, () => {
        deletedId = 12;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage("/transactions", <Transactions />);

    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Page 2")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Coffee")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete Coffee" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Transaction deleted.");
    expect(deletedId).toBe(12);
    expect(await screen.findByText("Page 1")).toBeInTheDocument();
    expect(await screen.findByText("Lunch")).toBeInTheDocument();
  });

  it("creates a budget and refreshes the budget cards", async () => {
    const user = userEvent.setup();
    let current = [];
    let posted;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.get(`${apiOrigin}/api/budgets/`, () => HttpResponse.json(page(current))),
      http.post(`${apiOrigin}/api/budgets/`, async ({ request }) => {
        posted = await request.json();
        current = [budget];
        return HttpResponse.json(budget, { status: 201 });
      }),
    );
    renderPage("/budgets", <Budgets />);

    expect(await screen.findByText("Make space for your goals")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Expense category"), "2");
    await user.type(screen.getByLabelText("Budget amount (€)"), "200");
    await user.type(screen.getByLabelText("Start date"), "2026-09-01");
    await user.type(screen.getByLabelText("End date"), "2026-09-30");
    await user.click(screen.getByRole("button", { name: "Create budget" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Budget created.");
    expect(await screen.findByText("Food", { selector: "strong" })).toBeInTheDocument();
    expect(posted).toMatchObject({ category: "2", amount: "200", start_date: "2026-09-01", end_date: "2026-09-30" });
  });

  it("edits and deletes a budget through its confirmation dialog", async () => {
    const user = userEvent.setup();
    let current = [budget];
    let updated;
    let deleted;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.get(`${apiOrigin}/api/budgets/`, () => HttpResponse.json(page(current))),
      http.patch(`${apiOrigin}/api/budgets/8/`, async ({ request }) => {
        updated = await request.json();
        current = [{ ...budget, ...updated }];
        return HttpResponse.json(current[0]);
      }),
      http.delete(`${apiOrigin}/api/budgets/8/`, () => {
        deleted = 8;
        current = [];
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderPage("/budgets", <Budgets />);

    expect(await screen.findByText("Food", { selector: "strong" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit Food budget" }));
    expect(screen.getByRole("heading", { name: "Edit budget" })).toBeInTheDocument();
    const amount = screen.getByLabelText("Budget amount (€)");
    await user.clear(amount);
    await user.type(amount, "250");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Budget updated.");
    expect(updated).toMatchObject({ category: 2, amount: "250" });

    await user.click(screen.getByRole("button", { name: "Delete Food budget" }));
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Budget deleted.");
    expect(deleted).toBe(8);
    expect(await screen.findByText("Make space for your goals")).toBeInTheDocument();
  });

  it("loads categories for a new transaction and submits the chosen fields", async () => {
    const user = userEvent.setup();
    let posted;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.get(`${apiOrigin}/api/transactions/`, () => HttpResponse.json(page([transaction]))),
      http.post(`${apiOrigin}/api/transactions/`, async ({ request }) => {
        posted = await request.json();
        return HttpResponse.json({ ...transaction, ...posted }, { status: 201 });
      }),
    );
    renderPage("/transactions/new", <TransactionForm />);

    expect(await screen.findByTestId("transaction-form")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Amount (€)"), "18.50");
    await user.selectOptions(screen.getByLabelText("Category"), "2");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-20" } });
    await user.type(screen.getByLabelText("Description"), "Lunch");
    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Transaction added.");
    expect(posted).toMatchObject({ type: "EXPENSE", amount: "18.5", category: "2", date: "2026-09-20", description: "Lunch" });
  });

  it("shows server validation errors beside the invalid amount", async () => {
    const user = userEvent.setup();
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.post(`${apiOrigin}/api/transactions/`, () =>
        HttpResponse.json({ fields: { amount: ["Amount must be greater than zero."] } }, { status: 400 }),
      ),
    );
    renderPage("/transactions/new", <TransactionForm />);
    await screen.findByTestId("transaction-form");
    await user.type(screen.getByLabelText("Amount (€)"), "0.50");
    await user.selectOptions(screen.getByLabelText("Category"), "2");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-09-20" } });
    await user.click(screen.getByRole("button", { name: "Add transaction" }));

    expect(await screen.findByText("Amount must be greater than zero.")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount (€)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("edits a transaction and resets its category when the transaction type changes", async () => {
    const user = userEvent.setup();
    let updated;
    server.use(
      authHandler(),
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.json(page(categories))),
      http.get(`${apiOrigin}/api/transactions/11/`, () => HttpResponse.json(transaction)),
      http.patch(`${apiOrigin}/api/transactions/11/`, async ({ request }) => {
        updated = await request.json();
        return HttpResponse.json({ ...transaction, ...updated, category_name: "Salary" });
      }),
      http.get(`${apiOrigin}/api/transactions/`, () =>
        HttpResponse.json(page([{ ...transaction, ...updated, category_name: "Salary" }])),
      ),
    );
    renderPage("/transactions/11/edit", <TransactionForm />, "/transactions/:id/edit");

    expect(await screen.findByRole("heading", { name: "Edit transaction" })).toBeInTheDocument();
    await screen.findByTestId("transaction-form");
    const type = screen.getByLabelText("Type");
    const category = screen.getByLabelText("Category");
    expect(category).toHaveValue("2");
    await user.selectOptions(type, "INCOME");
    expect(category).toHaveValue("");
    expect(within(category).getByRole("option", { name: "Salary" })).toBeInTheDocument();
    expect(within(category).queryByRole("option", { name: "Food" })).not.toBeInTheDocument();
    await user.selectOptions(category, "3");
    await user.clear(screen.getByLabelText("Amount (€)"));
    await user.type(screen.getByLabelText("Amount (€)"), "60");
    await user.clear(screen.getByLabelText("Description"));
    await user.type(screen.getByLabelText("Description"), "Monthly pay");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Transaction updated.");
    expect(await screen.findByText("Monthly pay")).toBeInTheDocument();
    expect(updated).toEqual({
      type: "INCOME",
      amount: "60",
      category: "3",
      date: "2026-09-20",
      description: "Monthly pay",
    });
  });
});
