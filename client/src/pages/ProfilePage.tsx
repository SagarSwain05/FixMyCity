import React, { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Camera, LogOut, Moon, Sun, Monitor, Mail, FileText, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import { api } from "../lib/api";
import { PageHeader, btnPrimary, btnSecondary, inputClass } from "../components/ui";

const ProfilePage: React.FC = () => {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zip: user?.address?.zip || "",
  });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "" });

  if (!user) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await api.updateProfile({ fullName: form.fullName, email: form.email, address: { city: form.city, state: form.state, zip: form.zip } });
      setUser(r.data);
      toast({ title: "Profile saved", message: "", tone: "success" });
    } catch (err) {
      toast({ title: "Could not save", message: (err as Error).message, tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleEmails = async () => {
    const r = await api.updateProfile({ emailNotifications: !user.emailNotifications });
    setUser(r.data);
  };

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    try {
      setUser((await api.uploadAvatar(file)).data);
    } catch (err) {
      toast({ title: "Upload failed", message: (err as Error).message, tone: "error" });
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "" });
      toast({ title: "Password updated", message: "", tone: "success" });
    } catch (err) {
      toast({ title: "Could not change password", message: (err as Error).message, tone: "error" });
    }
  };

  const initials = user.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PageHeader title="Profile & settings" />

      <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
        <button onClick={() => fileRef.current?.click()} className="relative shrink-0" aria-label="Change profile photo">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-600 text-white text-xl font-bold flex items-center justify-center">{initials}</div>
          )}
          <span className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 rounded-full p-1 shadow border border-gray-200 dark:border-gray-600">
            <Camera size={12} />
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white text-lg truncate">{user.fullName}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{user.phone}</p>
          <p className="text-sm text-primary-700 dark:text-primary-400 font-medium">{user.points} points</p>
        </div>
      </section>

      <Link to="/my-reports" className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <FileText size={20} className="text-primary-600" />
        <span className="flex-1 font-medium text-gray-900 dark:text-white">My reports</span>
        <ChevronRight size={18} className="text-gray-400" />
      </Link>

      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Preferences</h2>
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Theme</p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ["light", "Light", Sun],
              ["dark", "Dark", Moon],
              ["system", "System", Monitor],
            ] as const).map(([v, l, Icon]) => (
              <button
                key={v}
                onClick={() => setTheme(v)}
                aria-pressed={theme === v}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border-2 text-sm ${theme === v ? "border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200" : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"}`}
              >
                <Icon size={16} /> {l}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <Mail size={16} /> Email me when my reports change status
          </span>
          <button
            role="switch"
            aria-checked={user.emailNotifications}
            onClick={toggleEmails}
            className={`w-11 h-6 rounded-full relative transition-colors ${user.emailNotifications ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${user.emailNotifications ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>
      </section>

      <form onSubmit={save} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Personal details</h2>
        <input aria-label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} placeholder="Full name" required minLength={2} />
        <input aria-label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="Email" required />
        <div className="grid grid-cols-3 gap-2">
          <input aria-label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="City" />
          <input aria-label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} placeholder="State" />
          <input aria-label="PIN code" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className={inputClass} placeholder="PIN" />
        </div>
        <button disabled={saving} className={btnPrimary}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form onSubmit={changePassword} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-white">Change password</h2>
        <input aria-label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className={inputClass} placeholder="Current password" required />
        <input aria-label="New password" type="password" autoComplete="new-password" minLength={6} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className={inputClass} placeholder="New password (6+ characters)" required />
        <button className={btnSecondary}>Update password</button>
      </form>

      <button
        onClick={() => {
          logout();
          navigate("/login", { replace: true });
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 font-medium bg-white dark:bg-gray-800"
      >
        <LogOut size={18} /> Sign out
      </button>
    </div>
  );
};

export default ProfilePage;
