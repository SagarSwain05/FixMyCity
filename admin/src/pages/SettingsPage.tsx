import React, { useEffect, useState } from "react";
import { api, API_URL } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Card, PageTitle, btnPrimary, input } from "../components/ui";

interface Health {
  ok: boolean;
  db: { connected: boolean };
  storage: string;
  email: string;
  time: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [pw, setPw] = useState({ current: "", next: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "" });
      setMsg({ ok: true, text: "Password updated." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
  };

  const row = (label: string, value: React.ReactNode, ok?: boolean) => (
    <div className="flex justify-between py-2 border-b border-gray-100 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={ok === undefined ? "text-gray-900" : ok ? "text-green-700 font-medium" : "text-red-700 font-medium"}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <PageTitle title="Settings" />
      <Card title="Your account">
        {row("Name", user?.fullName)}
        {row("Email", user?.email)}
        {row("Mobile", user?.phone)}
        {row("Role", <span className="capitalize">{user?.role}</span>)}
      </Card>
      <Card title="Change password">
        <form onSubmit={change} className="space-y-3 max-w-sm">
          <input className={input} type="password" placeholder="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required aria-label="Current password" />
          <input className={input} type="password" placeholder="New password (6+ characters)" autoComplete="new-password" minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required aria-label="New password" />
          {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
          <button className={btnPrimary}>Update password</button>
        </form>
      </Card>
      <Card title="System status" subtitle={API_URL}>
        {!health ? (
          <p className="text-sm text-red-700">API unreachable</p>
        ) : (
          <>
            {row("API", health.ok ? "Operational" : "Degraded", health.ok)}
            {row("Database", health.db.connected ? "Connected" : "Disconnected", health.db.connected)}
            {row("Media storage", health.storage === "cloudinary" ? "Cloudinary" : "Local disk (not persistent)", health.storage === "cloudinary")}
            {row("Email notifications", health.email === "brevo" ? "Brevo" : "Disabled", health.email === "brevo")}
          </>
        )}
      </Card>
    </div>
  );
};

export default SettingsPage;
