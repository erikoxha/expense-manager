import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetProgress, Confirm, ErrorMessage, Field } from "../components/UI";

 describe("shared UI components", () => {
  it("connects a field-level validation message to its input", () => {
    render(
      <Field label="Amount (€)" name="amount" error={["Enter a valid amount."]} />,
    );

    const amount = screen.getByRole("textbox", { name: "Amount (€)" });
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(amount).toHaveAttribute("aria-describedby", "amount-error");
    expect(screen.getByText("Enter a valid amount.")).toBeInTheDocument();
  });

  it("shows an over-budget warning and caps only the visual progress value", () => {
    render(
      <BudgetProgress
        budget={{
          amount: "20.00",
          category_name: "Groceries",
          start_date: "2026-09-01",
          end_date: "2026-09-30",
          progress: {
            spent: "25.00",
            remaining: "-5.00",
            percentage: "125.00",
            status: "OVER_BUDGET",
          },
        }}
      />,
    );

    expect(screen.getByTestId("over-budget-warning")).toHaveTextContent("Over budget");
    expect(screen.getByRole("progressbar", { name: "Groceries budget used" })).toHaveValue(100);
    expect(screen.getByText(/€5\.00 over/)).toBeInTheDocument();
  });

  it("explains a mocked forbidden response in plain language", () => {
    render(<ErrorMessage error={{ status: 403, message: "secret detail" }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "You do not have permission to perform this action.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("secret detail");
  });

  it("prevents Escape from cancelling a deletion while it is in progress", () => {
    const onCancel = vi.fn();
    render(
      <Confirm item="transaction" onCancel={onCancel} onConfirm={() => {}} busy />,
    );
    const dialog = screen.getByRole("dialog");

    const event = new Event("cancel", { bubbles: true, cancelable: true });
    dialog.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
  });
});
