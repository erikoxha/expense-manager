import { http, HttpResponse } from "msw";
import { ApiError, api, resource, tokens } from "../services/api";
import { apiOrigin, server } from "./server";

describe("API transport with MSW at the HTTP boundary", () => {
  it("retries an expired access token with the rotated refresh response", async () => {
    tokens.set({ access: "expired", refresh: "refresh-1" });
    let transactionCalls = 0;
    server.use(
      http.get(`${apiOrigin}/api/transactions/`, ({ request }) => {
        expect(new URL(request.url).searchParams.get("page")).toBe("1");
        transactionCalls += 1;
        if (request.headers.get("authorization") === "Bearer expired") {
          return HttpResponse.json({ error: "Expired token" }, { status: 401 });
        }
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] });
      }),
      http.post(`${apiOrigin}/api/auth/refresh/`, async ({ request }) => {
        const body = await request.json();
        expect(body.refresh).toBe("refresh-1");
        return HttpResponse.json({ access: "fresh-access", refresh: "refresh-2" });
      }),
    );

    const result = await api("/transactions/?page=1");

    expect(result.results).toEqual([]);
    expect(transactionCalls).toBe(2);
    expect(tokens.get()).toEqual({ access: "fresh-access", refresh: "refresh-2" });
  });

  it.each([
    [403, "Not allowed"],
    [404, "Record not found"],
  ])("preserves the documented %i response status and message", async (status, message) => {
    tokens.set({ access: "valid", refresh: "refresh" });
    server.use(
      http.get(`${apiOrigin}/api/records/7/`, () =>
        HttpResponse.json({ error: message }, { status }),
      ),
    );

    await expect(api("/records/7/")).rejects.toMatchObject({ status, message });
  });

  it("clears the local session and signals expiry when refresh is rejected", async () => {
    tokens.set({ access: "expired", refresh: "revoked" });
    let expiredEvents = 0;
    const onExpired = () => expiredEvents++;
    window.addEventListener("session-expired", onExpired);
    server.use(
      http.get(`${apiOrigin}/api/private/`, () =>
        HttpResponse.json({ error: "Expired" }, { status: 401 }),
      ),
      http.post(`${apiOrigin}/api/auth/refresh/`, () =>
        HttpResponse.json({ error: "Invalid refresh" }, { status: 401 }),
      ),
    );

    await expect(api("/private/")).rejects.toMatchObject({ status: 401 });
    expect(tokens.get()).toBeNull();
    expect(expiredEvents).toBe(1);
    window.removeEventListener("session-expired", onExpired);
  });

  it("handles a bodyless 204 delete response", async () => {
    tokens.set({ access: "valid", refresh: "refresh" });
    server.use(
      http.delete(`${apiOrigin}/api/transactions/22/`, () => new HttpResponse(null, { status: 204 })),
    );

    await expect(api("/transactions/22/", { method: "DELETE" })).resolves.toBeNull();
  });

  it("turns a server failure into the documented generic error", async () => {
    tokens.set({ access: "valid", refresh: "refresh" });
    server.use(
      http.get(`${apiOrigin}/api/statistics/summary/`, () =>
        HttpResponse.json({ error: "Internal detail" }, { status: 500 }),
      ),
    );

    await expect(api("/statistics/summary/")).rejects.toMatchObject({
      status: 500,
      message: "Something went wrong on the server. Please try again.",
    });
  });

  it("explains network failures without exposing transport internals", async () => {
    server.use(
      http.get(`${apiOrigin}/api/categories/`, () => HttpResponse.error()),
    );

    await expect(api("/categories/")).rejects.toMatchObject({
      status: 0,
      message: "Unable to connect. Check your connection and try again.",
    });
    expect(ApiError).toBeTypeOf("function");
  });

  it("removes a malformed saved token value instead of crashing", () => {
    sessionStorage.setItem("ledger.session", "not-json");

    expect(tokens.get()).toBeNull();
    expect(sessionStorage.getItem("ledger.session")).toBeNull();
  });

  it("loads every page when a resource collection is paginated", async () => {
    const requestedPages = [];
    server.use(
      http.get(`${apiOrigin}/api/categories/`, ({ request }) => {
        const url = new URL(request.url);
        const pageNumber = url.searchParams.get("page");
        requestedPages.push(pageNumber);
        return pageNumber === "1"
          ? HttpResponse.json({ results: [{ id: 1 }], next: "?page=2" })
          : HttpResponse.json({ results: [{ id: 2 }], next: null });
      }),
    );

    await expect(resource("/categories/").all()).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    expect(requestedPages).toEqual(["1", "2"]);
  });

  it("uses a safe message when the server returns an unreadable error body", async () => {
    server.use(
      http.get(`${apiOrigin}/api/categories/`, () =>
        new HttpResponse("not-json", { status: 400 }),
      ),
    );

    await expect(api("/categories/")).rejects.toMatchObject({
      status: 400,
      message: "The server returned an unreadable response.",
    });
  });

  it("clears the session if the retried request is still unauthorized", async () => {
    tokens.set({ access: "expired", refresh: "refresh-1" });
    const expired = vi.fn();
    window.addEventListener("session-expired", expired);
    server.use(
      http.get(`${apiOrigin}/api/private/`, () =>
        HttpResponse.json({ error: "Expired" }, { status: 401 }),
      ),
      http.post(`${apiOrigin}/api/auth/refresh/`, () =>
        HttpResponse.json({ access: "fresh", refresh: "refresh-2" }),
      ),
    );

    await expect(api("/private/")).rejects.toMatchObject({ status: 401 });
    expect(tokens.get()).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener("session-expired", expired);
  });
});
