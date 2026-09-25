const base = import.meta.env.VITE_API_BASE_URL || "/api";
let refreshPromise;
export const tokens = {
  get: () => {
    try {
      return JSON.parse(sessionStorage.getItem("ledger.session") || "null");
    } catch {
      sessionStorage.removeItem("ledger.session");
      return null;
    }
  },
  set: (value) =>
    value
      ? sessionStorage.setItem("ledger.session", JSON.stringify(value))
      : sessionStorage.removeItem("ledger.session"),
};
export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
async function decode(response) {
  if (response.status === 204) return null;
  return response
    .json()
    .catch(() => ({ error: "The server returned an unreadable response." }));
}
async function refresh() {
  const current = tokens.get();
  if (!current?.refresh) throw new Error("No session");
  const response = await fetch(`${base}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: current.refresh }),
  });
  const data = await decode(response);
  if (!response.ok) throw new Error("Session expired");
  tokens.set(data);
  return data.access;
}
export async function api(
  path,
  { method = "GET", body, signal, anonymous = false, retry = true } = {},
) {
  let response;
  const requestAccess = tokens.get()?.access;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(!anonymous && tokens.get()?.access
          ? { Authorization: `Bearer ${tokens.get().access}` }
          : {}),
      },
      ...(body !== undefined
        ? { body: JSON.stringify(typeof body === "function" ? body() : body) }
        : {}),
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      "Unable to connect. Check your connection and try again.",
      0,
    );
  }
  if (response.status === 401 && !anonymous && retry) {
    if (tokens.get()?.access && tokens.get().access !== requestAccess)
      return api(path, { method, body, signal, anonymous, retry: false });
    try {
      if (!refreshPromise)
        refreshPromise = refresh().finally(() => {
          refreshPromise = null;
        });
      await refreshPromise;
    } catch {
      tokens.set(null);
      window.dispatchEvent(new Event("session-expired"));
      throw new ApiError("Your session expired. Please sign in again.", 401);
    }
    return api(path, { method, body, signal, anonymous, retry: false });
  }
  const data = await decode(response);
  if (response.status === 401 && !anonymous) {
    tokens.set(null);
    window.dispatchEvent(new Event("session-expired"));
  }
  if (!response.ok)
    throw new ApiError(
      response.status >= 500
        ? "Something went wrong on the server. Please try again."
        : data?.error || "Request failed.",
      response.status,
      data?.fields || {},
    );
  return data;
}
export const query = (values) =>
  new URLSearchParams(
    Object.entries(values).filter(([, v]) => v !== "" && v !== undefined),
  ).toString();
export function resource(path) {
  return {
    list: (params = {}, signal) => api(`${path}?${query(params)}`, { signal }),
    get: (id) => api(`${path}${id}/`),
    create: (body) => api(path, { method: "POST", body }),
    update: (id, body) => api(`${path}${id}/`, { method: "PATCH", body }),
    remove: (id) => api(`${path}${id}/`, { method: "DELETE" }),
    async all() {
      let page = 1,
        result = [],
        data;
      do {
        data = await api(`${path}?page=${page++}`);
        result.push(...data.results);
      } while (data.next);
      return result;
    },
  };
}
