import { api, tokens } from "./api";
export const authService = {
  login: (body) =>
    api("/auth/login/", { method: "POST", body, anonymous: true }),
  register: (body) =>
    api("/auth/register/", { method: "POST", body, anonymous: true }),
  me: () => api("/auth/me/"),
  logout: () =>
    api("/auth/logout/", {
      method: "POST",
      body: () => ({ refresh: tokens.get()?.refresh }),
    }),
};
