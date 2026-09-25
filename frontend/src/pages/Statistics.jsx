import { useResource } from "../hooks/useResource";
import { statisticsService as stats } from "../services/statisticsService";
import { Header, State, money } from "../components/UI";
import { TrendChart, Breakdown } from "../components/Charts";
export default function Statistics() {
  const resource = useResource(async () => {
    const [summary, monthly, income, expenses] = await Promise.all([
      stats.summary(),
      stats.monthly(),
      stats.income(),
      stats.expenses(),
    ]);
    return { summary, monthly, income, expenses };
  });
  const d = resource.data;
  return (
    <>
      <Header
        title="The bigger picture."
        subtitle="Get to know your patterns, one month at a time."
      />
      <State resource={resource}>
        {d && (
          <>
            <section className="card">
              <div className="section-heading">
                <div>
                  <h2>Income & expenses over time</h2>
                  <p>All recorded months · EUR</p>
                </div>
                <span className="badge green">
                  Balance {money(d.summary.balance)}
                </span>
              </div>
              <TrendChart rows={d.monthly} />
            </section>
            <div className="two-columns">
              <section className="card">
                <h2>Expense breakdown</h2>
                <p className="muted">All-time spending by category</p>
                <Breakdown rows={d.expenses} />
              </section>
              <section className="card">
                <h2>Income breakdown</h2>
                <p className="muted">All-time income by category</p>
                <Breakdown rows={d.income} label="Income" />
              </section>
            </div>
          </>
        )}
      </State>
    </>
  );
}
