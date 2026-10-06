import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { btnPrimary, input } from "../components/ui";
import ServerWake from "../components/ServerWake";

const LoginPage: React.FC = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(identifier.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src="/icon.svg" alt="" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">FixMyCity Command Center</h1>
          <p className="text-sm text-gray-600 mt-1">For municipal officials and department staff</p>
        </div>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
          <ServerWake />
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">
              Official email or mobile
            </label>
            <input id="id" autoComplete="username" className={input} value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input id="pw" type="password" autoComplete="current-password" className={input} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button className={`${btnPrimary} w-full py-2.5`} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-gray-500 flex items-center gap-1.5 justify-center">
            <Shield size={12} /> Access is restricted by role. Citizen accounts cannot sign in here.
          </p>
        </form>
        <p className="text-center text-sm text-gray-500 mt-5">
          <a href={import.meta.env.VITE_CLIENT_URL || "http://localhost:5173"} className="hover:text-gray-800">
            ← FixMyCity public site & citizen app
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
