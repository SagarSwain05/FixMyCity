import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setUnauthorizedHandler, tokenStore, type Address, type User } from "../lib/api";

interface SignupInput {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  address: Partial<Address>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Validate any saved token on startup.
  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch((e) => {
        if (e.status === 401) logout();
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = (accessToken: string, u: User) => {
    tokenStore.set(accessToken);
    setToken(accessToken);
    setUser(u);
  };

  const login = async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    accept(res.data.accessToken, res.data.user);
  };

  const signup = async (data: SignupInput) => {
    const res = await api.signup(data);
    accept(res.data.accessToken, res.data.user);
  };

  const refreshUser = async () => {
    if (!tokenStore.get()) return;
    setUser(await api.me());
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user && !!token, isLoading, login, signup, logout, refreshUser, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
