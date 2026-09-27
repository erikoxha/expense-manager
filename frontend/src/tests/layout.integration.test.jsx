import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import Layout from "../components/Layout";
import { apiOrigin, server } from "./server";

const profile = { id: 12, username: "layout-user", email: "layout@example.test" };

function renderLayout(initialEntry = "/dashboard", withSession = true) {
  if (withSession) {
    sessionStorage.setItem(
      "ledger.session",
      JSON.stringify({ access: "layout-access", refresh: "layout-refresh" }),
    );
  }
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<h1>Dashboard content</h1>} />
            <Route path="/categories" element={<h1>Category content</h1>} />
          </Route>
          <Route path="/login" element={<h1>Sign in required</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("authenticated application layout", () => {
  it("redirects to sign in when there is no saved session", async () => {
    renderLayout("/dashboard", false);

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeInTheDocument();
  });

  it("redirects to sign in after the saved session has expired", async () => {
    server.use(
      http.get(`${apiOrigin}/api/auth/me/`, () =>
        HttpResponse.json({ error: "Expired" }, { status: 401 }),
      ),
      http.post(`${apiOrigin}/api/auth/refresh/`, () =>
        HttpResponse.json({ error: "Revoked" }, { status: 401 }),
      ),
    );
    renderLayout();

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeInTheDocument();
    expect(sessionStorage.getItem("ledger.session")).toBeNull();
  });

  it("recovers a profile loading error when the user retries", async () => {
    let attempts = 0;
    server.use(
      http.get(`${apiOrigin}/api/auth/me/`, () => {
        attempts += 1;
        return attempts === 1
          ? HttpResponse.json({ error: "private server detail" }, { status: 500 })
          : HttpResponse.json(profile);
      }),
    );
    renderLayout();

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on the server.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("private server detail");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Dashboard content" })).toBeInTheDocument();
    expect(screen.getByText("LA", { selector: ".avatar" })).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  it("keeps the signed-in layout available and shows a logout failure", async () => {
    server.use(
      http.get(`${apiOrigin}/api/auth/me/`, () => HttpResponse.json(profile)),
      http.post(`${apiOrigin}/api/auth/logout/`, () =>
        HttpResponse.json({ error: "Logout could not be completed." }, { status: 503 }),
      ),
    );
    renderLayout();

    expect(await screen.findByRole("heading", { name: "Dashboard content" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on the server.");
    expect(screen.getByRole("heading", { name: "Dashboard content" })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("ledger.session"))).toMatchObject({ access: "layout-access" });
  });

  it("logs out and clears the local session after the API confirms", async () => {
    server.use(
      http.get(`${apiOrigin}/api/auth/me/`, () => HttpResponse.json(profile)),
      http.post(`${apiOrigin}/api/auth/logout/`, () => new HttpResponse(null, { status: 204 })),
    );
    renderLayout();

    expect(await screen.findByRole("heading", { name: "Dashboard content" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeInTheDocument();
    expect(sessionStorage.getItem("ledger.session")).toBeNull();
  });
});
