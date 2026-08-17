import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import type { AdminUser } from "../types";

type AuthState = {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(({ user: admin }) => setUser(admin)).catch(() => setUser(null)).finally(() => setLoading(false));
    const unauthorized = () => setUser(null);
    window.addEventListener("admin:unauthorized", unauthorized);
    return () => window.removeEventListener("admin:unauthorized", unauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    setUser(result.user);
  };

  const logout = async () => {
    try { await api.logout(); } finally { setUser(null); }
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
