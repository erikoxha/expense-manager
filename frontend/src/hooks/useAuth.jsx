import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { tokens } from "../services/api";
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(null);
  async function restore() {
    setLoading(true);
    setError(null);
    try {
      if (tokens.get()) setUser(await authService.me());
    } catch (e) {
      if (e.status === 401) {
        setUser(null);
        setError(null);
      } else setError(e);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    restore();
    const expired = () => {
      setUser(null);
      setError(null);
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  async function login(values) {
    tokens.set(await authService.login(values));
    setUser(await authService.me());
    setError(null);
  }
  async function logout() {
    await authService.logout();
    tokens.set(null);
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, loading, error, retry: restore, login, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
