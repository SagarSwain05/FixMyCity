import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ApiError } from "../lib/api";
import AuthShell from "./AuthShell";
import { btnPrimary, inputClass } from "../components/ui";

const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", city: "", state: "", zip: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const digits = form.phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (digits.length !== 10) return setFieldErrors({ phone: "Enter a 10-digit mobile number" });
    setLoading(true);
    try {
      await signup({
        fullName: form.fullName.trim(),
        phone: `+91${digits}`,
        email: form.email.trim(),
        password: form.password,
        address: { street: "", city: form.city.trim(), state: form.state.trim(), zip: form.zip.trim() },
      });
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.field.replace("address.", ""), f.message])));
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={k} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input id={k} value={form[k]} onChange={set(k)} className={inputClass} {...props} />
      {fieldErrors[k] && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors[k]}</p>}
    </div>
  );

  return (
    <AuthShell title="Join FixMyCity" subtitle="Report problems, verify your neighbours' reports, earn points">
      <form onSubmit={submit} className="space-y-3.5">
        {field("fullName", "Full name", { required: true, autoComplete: "name", minLength: 2 })}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mobile number
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">+91</span>
            <input id="phone" type="tel" inputMode="numeric" value={form.phone} onChange={set("phone")} placeholder="98765 43210" required autoComplete="tel-national" className={`${inputClass} rounded-l-none`} />
          </div>
          {fieldErrors.phone && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.phone}</p>}
        </div>
        {field("email", "Email", { type: "email", required: true, autoComplete: "email" })}
        {field("password", "Password", { type: "password", required: true, minLength: 6, autoComplete: "new-password", placeholder: "At least 6 characters" })}
        <div className="grid grid-cols-2 gap-3">
          {field("city", "City", { required: true, autoComplete: "address-level2", placeholder: "Bhubaneswar" })}
          {field("state", "State", { autoComplete: "address-level1", placeholder: "Odisha" })}
        </div>
        {field("zip", "PIN code", { inputMode: "numeric", autoComplete: "postal-code", maxLength: 6 })}
        {error && !Object.keys(fieldErrors).length && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-5">
        Already have an account?{" "}
        <Link to="/login" className="text-primary-700 dark:text-primary-400 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignupPage;
