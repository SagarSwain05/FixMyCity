import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Users, Mail } from "lucide-react";
import { api, type Category, type Department } from "../lib/api";
import { CATEGORIES } from "../lib/format";
import { useDepartments } from "../lib/useDepartments";
import { Card, PageTitle, btnPrimary, btnSecondary, btnDanger, input } from "../components/ui";

type Draft = Partial<Department> & { categories: Category[] };
const EMPTY: Draft = { name: "", code: "", description: "", color: "#16a34a", categories: [], contactEmail: "", head: "" };

const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { departments, reload } = useDepartments();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);
    const body = {
      name: draft.name,
      code: draft.code,
      description: draft.description || undefined,
      color: draft.color,
      categories: draft.categories,
      contactEmail: draft.contactEmail || "",
      head: draft.head || undefined,
    };
    try {
      if (draft._id) await api.updateDepartment(draft._id, body);
      else await api.createDepartment(body);
      await reload();
      setDraft(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Department) => {
    if (!confirm(`Delete ${d.name}?`)) return;
    try {
      await api.deleteDepartment(d._id);
      await reload();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const owner = (c: Category) => departments.find((d) => d.categories.includes(c) && d._id !== draft?._id);

  return (
    <div className="space-y-5">
      <PageTitle
        title="Departments"
        subtitle="New reports are auto-routed to the department that owns their category"
        right={
          <button className={btnPrimary} onClick={() => setDraft({ ...EMPTY })}>
            <Plus size={16} /> New department
          </button>
        }
      />

      {draft && (
        <Card title={draft._id ? `Edit ${draft.name}` : "New department"}>
          <form onSubmit={save} className="grid md:grid-cols-2 gap-3">
            <input className={input} placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required aria-label="Name" />
            <div className="flex gap-2">
              <input className={input} placeholder="Code (e.g. PWD)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} required maxLength={10} aria-label="Code" />
              <input type="color" className="h-10 w-14 rounded border border-gray-300" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} aria-label="Colour" />
            </div>
            <input className={input} placeholder="Head of department" value={draft.head || ""} onChange={(e) => setDraft({ ...draft, head: e.target.value })} aria-label="Head" />
            <input className={input} type="email" placeholder="Contact email" value={draft.contactEmail || ""} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} aria-label="Contact email" />
            <textarea className={`${input} md:col-span-2 resize-none`} rows={2} placeholder="Description" value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} aria-label="Description" />
            <fieldset className="md:col-span-2">
              <legend className="text-sm font-medium text-gray-700 mb-2">Handles categories</legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const on = draft.categories.includes(c.value);
                  const other = owner(c.value);
                  return (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setDraft({ ...draft, categories: on ? draft.categories.filter((x) => x !== c.value) : [...draft.categories, c.value] })}
                      className={`px-3 py-1.5 rounded-full text-sm border ${on ? "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-700"}`}
                      title={other ? `Currently routed to ${other.name}` : undefined}
                    >
                      {c.label}
                      {other && !on ? ` (${other.code})` : ""}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">If two departments share a category, new reports go to the first one found. Keep each category with one department.</p>
            </fieldset>
            {error && <p className="text-sm text-red-700 md:col-span-2">{error}</p>}
            <div className="flex gap-2 md:col-span-2">
              <button className={btnPrimary} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" className={btnSecondary} onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {departments.map((d) => (
          <div key={d._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: d.color }}>
                {d.code}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900">{d.name}</h3>
                <p className="text-xs text-gray-500">{d.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {d.categories.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {CATEGORIES.find((x) => x.value === c)?.label ?? c}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center tabular-nums">
              <button className="rounded-lg bg-gray-50 py-2 hover:bg-gray-100" onClick={() => navigate(`/reports?department=${d._id}&status=open`)}>
                <p className="text-lg font-bold text-gray-900">{d.activeReports}</p>
                <p className="text-[11px] text-gray-500">Open</p>
              </button>
              <div className="rounded-lg bg-gray-50 py-2">
                <p className="text-lg font-bold text-gray-900">{d.resolvedReports}</p>
                <p className="text-[11px] text-gray-500">Resolved</p>
              </div>
              <button className="rounded-lg bg-gray-50 py-2 hover:bg-gray-100" onClick={() => navigate(`/staff?department=${d._id}`)}>
                <p className="text-lg font-bold text-gray-900">{d.staffCount}</p>
                <p className="text-[11px] text-gray-500">Staff</p>
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-3 space-y-1">
              {d.head && (
                <p className="flex items-center gap-1">
                  <Users size={12} /> {d.head}
                </p>
              )}
              {d.contactEmail && (
                <p className="flex items-center gap-1">
                  <Mail size={12} /> {d.contactEmail}
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-auto pt-4">
              <button className={btnSecondary} onClick={() => setDraft({ ...d })}>
                <Pencil size={14} /> Edit
              </button>
              <button className={btnDanger} onClick={() => remove(d)} aria-label={`Delete ${d.name}`}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DepartmentsPage;
