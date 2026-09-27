import { http, HttpResponse, delay } from "msw";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../hooks/useAuth";
import Layout from "../components/Layout";
import Categories from "../pages/Categories";
import { apiOrigin, server } from "./server";

function renderCategories() {
  sessionStorage.setItem(
    "ledger.session",
    JSON.stringify({ access: "test-access", refresh: "test-refresh" }),
  );
  return render(
    <MemoryRouter initialEntries={["/categories"]}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/categories" element={<Categories />} />
          </Route>
          <Route path="/login" element={<h1>Sign in required</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const profile = { id: 4, username: "page-test", email: "page@example.test" };
const emptyPage = { count: 0, next: null, previous: null, results: [] };

describe("categories page and API loading states", () => {
  it("shows loading before rendering the successful empty state", async () => {
    server.use(
      http.get(`${apiOrigin}/api/auth/me/`, () => HttpResponse.json(profile)),
      http.get(`${apiOrigin}/api/categories/`, async () => {
        await delay(100);
        return HttpResponse.json(emptyPage);
      }),
    );
    renderCategories();

    expect(await screen.findByText("Loading your finances…")).toBeInTheDocument();
    expect(await screen.findByText("Start with a few categories")).toBeInTheDocument();
  });

  it("shows a generic server error and recovers when the user retries", async () => {
    let attempts = 0;
    server.use(
      http.get(`${apiOrigin}/api/auth/me/`, () => HttpResponse.json(profile)),
      http.get(`${apiOrigin}/api/categories/`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json({ error: "internal exception details" }, { status: 500 });
        }
        return HttpResponse.json(emptyPage);
      }),
    );
    renderCategories();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong on the server. Please try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("internal exception");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Start with a few categories")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
