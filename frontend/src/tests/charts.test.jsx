import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("recharts", () => {
  const Container = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Container,
    AreaChart: ({ data }) => (
      <div data-testid="area-chart" data-series={JSON.stringify(data)} />
    ),
    PieChart: Container,
    Pie: ({ data, children }) => (
      <div data-testid="pie-chart" data-series={JSON.stringify(data)}>{children}</div>
    ),
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Area: () => null,
    Cell: () => null,
  };
});

import { Breakdown, TrendChart } from "../components/Charts";

describe("accessible chart summaries", () => {
  it("converts monthly values for the chart and lists exact values in a table", () => {
    const rows = [
      { month: "2026-08", income: "1200.00", expenses: "450.25" },
      { month: "2026-09", income: "900.50", expenses: "610.00" },
    ];
    render(<TrendChart rows={rows} />);

    expect(screen.getByRole("img", { name: /Monthly income and expenses/ })).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("area-chart").dataset.series)).toEqual([
      { month: "2026-08", income: 1200, expenses: 450.25 },
      { month: "2026-09", income: 900.5, expenses: 610 },
    ]);
    fireEvent.click(screen.getByText("View chart data"));
    expect(screen.getByRole("table")).toHaveTextContent("2026-08");
    expect(screen.getByRole("table")).toHaveTextContent("€1,200.00");
    expect(screen.getByRole("table")).toHaveTextContent("€450.25");
  });

  it("maps category totals into pie values and readable legend rows", () => {
    const rows = [
      { category: 2, name: "Food", amount: "88.40" },
      { category: 3, name: "Rent", amount: "700.00" },
    ];
    render(<Breakdown rows={rows} label="Expenses" />);

    expect(screen.getByRole("img", { name: "Expenses by category. Values listed below." })).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("pie-chart").dataset.series)).toEqual([
      { category: 2, name: "Food", amount: "88.40", value: 88.4 },
      { category: 3, name: "Rent", amount: "700.00", value: 700 },
    ]);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("€88.40")).toBeInTheDocument();
    expect(screen.getByText("€700.00")).toBeInTheDocument();
  });
});
