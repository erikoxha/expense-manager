import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import Layout from "./components/Layout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import TransactionForm from "./pages/TransactionForm";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import Statistics from "./pages/Statistics";
import "./styles.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Auth key="login" />} />
          <Route path="/register" element={<Auth key="register" register />} />
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="transactions/new" element={<TransactionForm />} />
            <Route path="transactions/:id/edit" element={<TransactionForm />} />
            <Route path="categories" element={<Categories />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="statistics" element={<Statistics />} />
            <Route
              path="*"
              element={
                <div className="state">
                  <h1>Page not found</h1>
                  <Link to="/dashboard">Return to overview</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
