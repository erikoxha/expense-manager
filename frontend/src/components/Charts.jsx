import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Empty, money } from "./UI";
const colors = [
  "#087f72",
  "#3a9fcb",
  "#f0b64b",
  "#7966b2",
  "#e78668",
  "#78919d",
];
export function TrendChart({ rows }) {
  return rows.length ? (
    <div
      className="chart"
      role="img"
      aria-label="Monthly income and expenses. Exact values are listed below."
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={rows.map((r) => ({
            ...r,
            income: Number(r.income),
            expenses: Number(r.expenses),
          }))}
          margin={{ top: 10, right: 15, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#087f72" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#087f72" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="4 4"
            vertical={false}
            stroke="#e9eef0"
          />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} width={55} />
          <Tooltip formatter={money} />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#087f72"
            strokeWidth={3}
            fill="url(#incomeFill)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#e49c40"
            strokeWidth={2}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
      <details>
        <summary>View chart data</summary>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{money(r.income)}</td>
                <td>{money(r.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  ) : (
    <Empty title="Your timeline starts here">
      <p>Add your first transaction to see the bigger picture.</p>
    </Empty>
  );
}
export function Breakdown({ rows, label = "Expenses" }) {
  return rows.length ? (
    <div>
      <div role="img" aria-label={`${label} by category. Values listed below.`}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={rows.map((r) => ({ ...r, value: Number(r.amount) }))}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={3}
              stroke="none"
            >
              {rows.map((r, i) => (
                <Cell key={r.category} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={money} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {rows.map((r, i) => (
          <div className="row" key={r.category}>
            <span>
              <i style={{ background: colors[i % colors.length] }} />
              {r.name}
            </span>
            <strong>{money(r.amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Empty title={`No ${label.toLowerCase()} yet`}>
      <p>Your category breakdown will appear here.</p>
    </Empty>
  );
}
