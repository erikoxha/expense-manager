import { NavLink, Outlet, Navigate } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  ChartNoAxesCombined,
  Wallet,
  LogOut,
  Target,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ErrorMessage } from "./UI";
const links = [
  ["/dashboard", "Overview", LayoutDashboard],
  ["/transactions", "Transactions", ArrowLeftRight],
  ["/budgets", "Budgets", Target],
  ["/categories", "Categories", Tags],
  ["/statistics", "Statistics", ChartNoAxesCombined],
];
export default function Layout() {
  const { user, loading, error, retry, logout } = useAuth();
  const [logoutError, setLogoutError] = useState(null),
    [busy, setBusy] = useState(false);
  if (loading) return <div className="state">Restoring your session…</div>;
  if (error)
    return (
      <div className="state">
        <ErrorMessage error={error} />
        <button onClick={retry}>Retry</button>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand">
          <span className="brand-mark">
            <Wallet size={22} />
          </span>
          ledger<span className="brand-dot">.</span>
        </NavLink>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          {links.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <Target size={23} />
          <strong>
            A little clarity.
            <br />
            More peace of mind.
          </strong>
          <p>Make room for what matters.</p>
        </div>
        <div className="profile">
          <span className="avatar">
            {user.username.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{user.username}</strong>
            <small>Personal account</small>
          </div>
          <button
            aria-label="Log out"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await logout();
              } catch (e) {
                setLogoutError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
        <ErrorMessage error={logoutError} />
      </aside>
      <main id="main">
        <div className="topbar">
          <span>Personal Expense & Budget Manager</span>
          <span className="currency">EUR · €</span>
        </div>
        <div className="page">
          <Outlet />
        </div>
        <footer>
          Built for a clearer financial picture.
          <span>Ledger / Personal finance</span>
        </footer>
      </main>
    </div>
  );
}
