import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setUnauthorizedHandler, tokenStore, type User } from "../lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  useEffect(() => {
    if (!tokenStore.get()) return setIsLoading(false);
    api
      .me()
      .then((u) => (u.role === "citizen" ? logout() : setUser(u)))
      .catch(() => logout())
      .finally(() => setIsLoading(false));
  }, [logout]);

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    if (res.data.user.role === "citizen") throw new Error("This portal is for municipal officials only.");
    tokenStore.set(res.data.accessToken);
    setUser(await api.me());
  };

  return <AuthContext.Provider value={{ user, isLoading, isAdmin: user?.role === "admin", login, logout }}>{children}</AuthContext.Provider>;
};
