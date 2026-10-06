import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UserPlus, Search } from "lucide-react";
import { api, type Role, type User } from "../lib/api";
import { useDepartments } from "../lib/useDepartments";
import { useAuth } from "../contexts/AuthContext";
import { Card, ErrorBanner, PageTitle, Spinner, btnPrimary, btnSecondary, input, select } from "../components/ui";

const StaffPage: React.FC = () => {
  const { departments } = useDepartments();
  const { user: me } = useAuth();
  const [params, setParams] = useSearchParams();
  const role = params.get("role") ?? "staff,admin";
  const department = params.get("department") || "";
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", password: "", role: "staff" as "staff" | "admin", department: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .users({ role, department, q })
      .then((r) => setUsers(r.items))
      .catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, department]);

  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await api.createStaff({ ...form, department: form.department || null });
      setShowForm(false);
      setForm({ fullName: "", phone: "", email: "", password: "", role: "staff", department: "" });
      load();
    } catch (err) {
      setFormError((err as Error).message);
    }
  };

  const update = async (u: User, data: { role?: Role; department?: string | null; isActive?: boolean }) => {
    try {
      const updated = await api.updateUser(u.id, data);
      setUsers((list) => list?.map((x) => (x.id === u.id ? updated : x)) ?? null);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const deptId = (u: User) => (u.department && typeof u.department === "object" ? u.department._id : (u.department as string) || "");

  return (
    <div className="space-y-5">
      <PageTitle
        title="Staff & users"
        subtitle="Create field staff, assign them to departments, manage roles"
        right={
          <button className={btnPrimary} onClick={() => setShowForm((v) => !v)}>
            <UserPlus size={16} /> Add staff
          </button>
        }
      />

      {showForm && (
        <Card title="New staff account" subtitle="Share the password with them securely; they can change it from Settings.">
          <form onSubmit={create} className="grid md:grid-cols-3 gap-3">
            <input className={input} placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required aria-label="Full name" />
            <input className={input} placeholder="Mobile (10 digits)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required aria-label="Mobile" />
            <input className={input} type="email" placeholder="Official email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required aria-label="Email" />
            <input className={input} type="text" placeholder="Temporary password (6+)" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required aria-label="Temporary password" />
            <select className={select} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "staff" | "admin" })} aria-label="Role">
              <option value="staff">Department staff</option>
              <option value="admin">Administrator</option>
            </select>
            <select className={select} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required={form.role === "staff"} aria-label="Department">
              <option value="">{form.role === "staff" ? "Choose department" : "No department"}</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            {formError && <p className="text-sm text-red-700 md:col-span-3">{formError}</p>}
            <div className="md:col-span-3 flex gap-2">
              <button className={btnPrimary}>Create account</button>
              <button type="button" className={btnSecondary} onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <select className={select} value={role} onChange={(e) => setParams({ ...Object.fromEntries(params), role: e.target.value })} aria-label="Role filter">
          <option value="staff,admin">Officials</option>
          <option value="staff">Staff</option>
          <option value="admin">Admins</option>
          <option value="citizen">Citizens</option>
        </select>
        <select
          className={select}
          value={department}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            if (e.target.value) next.set("department", e.target.value);
            else next.delete("department");
            setParams(next);
          }}
          aria-label="Department filter"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${input} pl-9 w-64`} placeholder="Search name, email, phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </form>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {!users ? (
        <Spinner />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-3 py-2.5 font-medium">Contact</th>
                <th className="px-3 py-2.5 font-medium">Role</th>
                <th className="px-3 py-2.5 font-medium">Department</th>
                <th className="px-3 py-2.5 font-medium">Points</th>
                <th className="px-3 py-2.5 font-medium">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    No users found.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {u.fullName} {self && <span className="text-xs text-gray-400">(you)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      {u.email}
                      <br />
                      <span className="text-xs">{u.phone}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <select className={select} value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value as Role })} aria-label={`Role of ${u.fullName}`}>
                        <option value="citizen">Citizen</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <select className={select} value={deptId(u)} onChange={(e) => update(u, { department: e.target.value || null })} aria-label={`Department of ${u.fullName}`}>
                        <option value="">—</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.code}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{u.points}</td>
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={u.isActive !== false} disabled={self} onChange={(e) => update(u, { isActive: e.target.checked })} aria-label={`${u.fullName} active`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
