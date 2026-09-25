import { Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useResource } from "../hooks/useResource";
import { statisticsService as stats } from "../services/statisticsService";
import { transactionService } from "../services/transactionService";
import {
  Header,
  State,
  money,
  BudgetProgress,
  TransactionTable,
  Empty,
} from "../components/UI";
import { TrendChart, Breakdown } from "../components/Charts";
export default function Dashboard() {
  const { user } = useAuth();
  const resource = useResource(async () => {
    const [summary, monthly, expenses, budgets, transactions, income] =
      await Promise.all([
        stats.summary(),
        stats.monthly(),
        stats.expenses(),
        stats.budgets(),
        transactionService.list(),
        stats.income(),
      ]);
    return { summary, monthly, expenses, budgets, transactions, income };
  });
  const d = resource.data;
  return (
    <>
      <Header
        title={`A clearer picture, ${user.username}.`}
        subtitle="Your money at a glance. Every little step counts."
        action={
          <Link to="/transactions/new" className="button">
            <Plus size={18} />
            Add transaction
          </Link>
        }
      />
      <State resource={resource}>
        {d && (
          <>
            <div className="stats-grid">
              {[
                ["Current balance", d.summary.balance, Wallet, "balance"],
                ["Total income", d.summary.income, ArrowDownLeft, "income"],
                ["Total expenses", d.summary.expenses, ArrowUpRight, "expense"],
                ["Transactions", d.summary.transaction_count, Layers, "count"],
              ].map(([title, value, Icon, type]) => (
                <article key={title} className={`stat-card ${type}`}>
                  <div className="row">
                    <span>{title}</span>
                    <Icon size={19} />
                  </div>
                  <strong>{type === "count" ? value : money(value)}</strong>
                  <small>
                    {type === "balance"
                      ? "Income minus expenses"
                      : type === "count"
                        ? "All your recorded activity"
                        : "All time"}
                  </small>
                </article>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>Cash flow</h2>
                    <p>A month-by-month perspective</p>
                  </div>
                  <div className="chart-key">
                    <span>● Income</span>
                    <span>● Expenses</span>
                  </div>
                </div>
                <TrendChart rows={d.monthly} />
              </section>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>Where it goes</h2>
                    <p>Expenses by category · all time</p>
                  </div>
                </div>
                <Breakdown rows={d.expenses} />
              </section>

              <section className="card recent">
                <div className="section-heading">
                  <div>
                    <h2>Recent transactions</h2>
                    <p>The latest in your day-to-day</p>
                  </div>
                  <Link className="text-link" to="/transactions">
                    View all <ArrowRight size={16} />
                  </Link>
                </div>
                <TransactionTable
                  rows={d.transactions.results.slice(0, 5)}
                  compact
                />
              </section>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>Budget check-in</h2>
                    <p>A little planning goes a long way</p>
                  </div>
                  <Link to="/budgets" className="text-link">
                    View all
                  </Link>
                </div>
                {d.budgets.length ? (
                  d.budgets
                    .slice(0, 3)
                    .map((b) => <BudgetProgress key={b.id} budget={b} />)
                ) : (
                  <Empty title="Give your spending a plan">
                    <Link to="/budgets" className="text-link">
                      Create a budget
                    </Link>
                  </Empty>
                )}
              </section>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>Where it comes from</h2>
                    <p>Income by category · all time</p>
                  </div>
                </div>
                <Breakdown rows={d.income} label="Income" />
              </section>
            </div>
          </>
        )}
      </State>
    </>
  );
}
