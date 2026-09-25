import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Wallet, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";
import { Field, ErrorMessage } from "../components/UI";
export default function Auth({ register = false }) {
  const { user, login } = useAuth(),
    navigate = useNavigate();
  const [values, setValues] = useState({
      username: "",
      email: "",
      password: "",
    }),
    [error, setError] = useState(null),
    [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/dashboard" replace />;
  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (register) await authService.register(values);
      await login({ username: values.username, password: values.password });
      navigate("/dashboard");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">
            <Wallet />
          </span>
          ledger.
        </div>
        <div>
          <span className="eyebrow">A CLEARER VIEW OF YOUR MONEY</span>
          <h1>
            Small habits.
            <br />
            Bigger possibilities.
          </h1>
          <p>
            A place for your everyday spending,
            <br />
            your plans, and everything in between.
          </p>
          <div className="auth-benefits">
            {[
              "Know where your money goes",
              "Plan with confidence",
              "See your progress, every day",
            ].map((t) => (
              <div key={t}>
                <Check size={18} />
                {t}
              </div>
            ))}
          </div>
        </div>
        <small>Personal Expense & Budget Manager</small>
      </section>
      <section className="auth-form">
        <div>
          <span className="eyebrow">YOUR PERSONAL WORKSPACE</span>
          <h2>{register ? "Start a fresh chapter." : "Welcome back."}</h2>
          <p>
            {register
              ? "Create your account and make yourself at home."
              : "Sign in to see your money at a glance."}
          </p>
          <form onSubmit={submit}>
            <ErrorMessage error={error} />
            <Field
              label="Username"
              name="username"
              autoComplete="username"
              required
              maxLength={150}
              value={values.username}
              onChange={(e) =>
                setValues({ ...values, username: e.target.value })
              }
              error={error?.fields.username}
            />
            {register && (
              <Field
                label="Email address"
                name="email"
                type="email"
                required
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
                error={error?.fields.email}
              />
            )}
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              maxLength={128}
              minLength={register ? 8 : undefined}
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
              error={error?.fields.password}
            />
            {register && (
              <small className="muted">
                Use at least 8 characters and avoid common passwords.
              </small>
            )}
            <button
              className="button full"
              data-testid={register ? "register-button" : "login-button"}
              disabled={busy}
            >
              {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Ledger?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
