import { expect, test } from "@playwright/test";

const password = "SafeLedgerPass_2026!";
const localDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const monthBounds = () => {
  const now = new Date();
  return {
    start: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};
const suffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

async function expectNotice(page, message) {
  await expect(page.getByText(message, { exact: true })).toBeVisible();
}

async function register(page, user, email) {
  await page.goto("/register");
  await page.getByRole("textbox", { name: "Username" }).fill(user);
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByTestId("register-button").click();
  await expect(page.getByRole("heading", { name: `A clearer picture, ${user}.` })).toBeVisible();
}

async function addTransaction(page, { type, amount, category, description, date }) {
  await page.goto("/transactions/new");
  await page.getByLabel("Type").selectOption(type);
  await page.getByLabel("Amount (€)").fill(amount);
  await page.getByLabel("Category").selectOption({ label: category });
  await page.getByLabel("Date").fill(date);
  await page.getByLabel("Description").fill(description);
  await page.getByRole("button", { name: "Add transaction" }).click();
  await expectNotice(page, "Transaction added.");
}

test("registers, manages finance records, verifies totals and isolates a second user", async ({ page }) => {
  const id = suffix();
  const username = `ledger_e2e_${id}`;
  const email = `ledger_e2e_${id}@example.test`;
  const groceries = `Groceries ${id}`;
  const salary = `Salary ${id}`;
  const transport = `Transport ${id}`;
  const lunch = `e2e lunch ${id}`;
  const coffee = `e2e coffee ${id}`;
  const today = localDate(new Date());
  const { start, end } = monthBounds();

  await register(page, username, email);

  await page.getByRole("link", { name: "Categories" }).click();
  await page.getByLabel("Name").fill(groceries);
  await page.getByRole("button", { name: "Create category" }).click();
  await expectNotice(page, "Category created.");

  await page.getByLabel("Name").fill(salary);
  await page.getByLabel("Type").selectOption("INCOME");
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page.getByText(salary)).toBeVisible();

  await page.getByLabel("Name").fill(`Temporary ${id}`);
  await page.getByLabel("Type").selectOption("EXPENSE");
  await page.getByRole("button", { name: "Create category" }).click();
  await page.getByRole("button", { name: `Edit Temporary ${id}` }).click();
  await page.getByLabel("Name").fill(transport);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(transport)).toBeVisible();
  await page.getByRole("button", { name: `Delete ${transport}` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expectNotice(page, "Category deleted.");

  await addTransaction(page, {
    type: "INCOME",
    amount: "100.00",
    category: salary,
    description: `e2e salary ${id}`,
    date: today,
  });
  await addTransaction(page, {
    type: "EXPENSE",
    amount: "20.00",
    category: groceries,
    description: lunch,
    date: today,
  });
  await addTransaction(page, {
    type: "EXPENSE",
    amount: "5.00",
    category: groceries,
    description: coffee,
    date: today,
  });

  await page.getByRole("link", { name: "Budgets" }).click();
  await page.getByLabel("Expense category").selectOption({ label: groceries });
  await page.getByLabel("Budget amount (€)").fill("100.00");
  await page.getByLabel("Start date").fill(start);
  await page.getByLabel("End date").fill(end);
  await page.getByRole("button", { name: "Create budget" }).click();
  await expectNotice(page, "Budget created.");
  await expect(page.getByTestId("budget-progress")).toContainText("€25.00");

  await page.getByRole("button", { name: `Edit ${groceries} budget` }).click();
  await page.getByLabel("Budget amount (€)").fill("120.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectNotice(page, "Budget updated.");

  await page.getByRole("link", { name: "Transactions" }).click();
  await page.getByLabel("Search descriptions").fill(lunch);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(lunch)).toBeVisible();
  await expect(page.getByText(coffee)).toHaveCount(0);
  await page.getByRole("link", { name: `Edit ${lunch}` }).click();
  await page.getByLabel("Amount (€)").fill("25.00");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expectNotice(page, "Transaction updated.");
  await page.getByRole("button", { name: `Delete ${lunch}` }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expectNotice(page, "Transaction deleted.");

  await page.getByRole("link", { name: "Overview" }).click();
  const incomeCard = page.locator(".stat-card.income");
  const expenseCard = page.locator(".stat-card.expense");
  const balanceCard = page.locator(".stat-card.balance");
  await expect(incomeCard).toContainText("€100.00");
  await expect(expenseCard).toContainText("€5.00");
  await expect(balanceCard).toContainText("€95.00");

  await page.getByRole("link", { name: "Budgets" }).click();
  await page.getByRole("button", { name: `Delete ${groceries} budget` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expectNotice(page, "Budget deleted.");

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  const secondUser = `ledger_isolation_${id}`;
  await register(page, secondUser, `ledger_isolation_${id}@example.test`);
  await page.getByRole("link", { name: "Categories" }).click();
  await expect(page.getByText(groceries)).toHaveCount(0);
  await expect(page.getByText(salary)).toHaveCount(0);
});