import { http, HttpResponse } from "msw";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import Auth from "../pages/Auth";
import { apiOrigin, server } from "./server";

function renderAuth(path = "/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth register />} />
          <Route path="/dashboard" element={<h1>Signed-in dashboard</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("authentication page over the HTTP boundary", () => {
  it("shows API field errors after invalid credentials", async () => {
    server.use(
      http.post(`${apiOrigin}/api/auth/login/`, () =>
        HttpResponse.json(
          {
            error: "Please check the submitted fields.",
            fields: { username: ["No active account found with the given credentials."] },
          },
          { status: 400 },
        ),
      ),
    );
    renderAuth();

    await screen.findByRole("heading", { name: "Welcome back." });
    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "not-a-user" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByTestId("login-button"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please check the submitted fields.");
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("registers, logs in, loads the profile and navigates into the app", async () => {
    server.use(
      http.post(`${apiOrigin}/api/auth/register/`, () =>
        HttpResponse.json({ id: 7, username: "reader", email: "reader@example.test" }, { status: 201 }),
      ),
      http.post(`${apiOrigin}/api/auth/login/`, () =>
        HttpResponse.json({ access: "access-token", refresh: "refresh-token" }),
      ),
      http.get(`${apiOrigin}/api/auth/me/`, () =>
        HttpResponse.json({ id: 7, username: "reader", email: "reader@example.test" }),
      ),
    );
    renderAuth("/register");

    fireEvent.change(screen.getByRole("textbox", { name: "Username" }), {
      target: { value: "reader" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Email address" }), {
      target: { value: "reader@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "safe-password-123" },
    });
    fireEvent.click(screen.getByTestId("register-button"));

    expect(await screen.findByRole("heading", { name: "Signed-in dashboard" })).toBeInTheDocument();
    await waitFor(() => expect(sessionStorage.getItem("ledger.session")).toContain("access-token"));
  });
});
