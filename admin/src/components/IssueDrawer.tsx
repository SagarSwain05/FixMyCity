import React, { useEffect, useState } from "react";
import { X, MapPin, ThumbsUp, ShieldCheck, AlertTriangle, ExternalLink, Upload, Trash2 } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { api, type Department, type Issue, type IssueStatus, type IssueUpdate, type User, type Urgency, type Category } from "../lib/api";
import { CATEGORIES, STATUS_LABEL, URGENCY_LABEL, formatDateTime, timeAgo } from "../lib/format";
import { useAuth } from "../contexts/AuthContext";
import { StatusBadge, UrgencyBadge, Spinner, btnPrimary, btnSecondary, btnDanger, input, select } from "./ui";
import { pinIcon } from "./mapIcons";

interface Props {
  issueId: string;
  departments: Department[];
  onClose: () => void;
  onChanged: (issue: Issue | null) => void;
}

const NEXT: Partial<Record<IssueStatus, { to: IssueStatus; label: string }>> = {
  pending: { to: "verified", label: "Verify & route" },
  verified: { to: "in-progress", label: "Start work" },
  "in-progress": { to: "resolved", label: "Mark resolved" },
};

const IssueDrawer: React.FC<Props> = ({ issueId, departments, onClose, onChanged }) => {
  const { user, isAdmin } = useAuth();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [staff, setStaff] = useState<User[]>([]);
  const [form, setForm] = useState<{ category: Category; urgency: Urgency; dept: string; assignee: string; note: string; resolutionNote: string; rejectionReason: string }>({
    category: "other",
    urgency: "medium",
    dept: "",
    assignee: "",
    note: "",
    resolutionNote: "",
    rejectionReason: "",
  });
  const [proof, setProof] = useState<File[]>([]);
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    setIssue(null);
    setError(null);
    setRejecting(false);
    setProof([]);
    api
      .issue(issueId)
      .then((i) => {
        setIssue(i);
        setForm({
          category: i.category,
          urgency: i.urgency,
          dept: i.assignedDepartment?._id || "",
          assignee: i.assignedTo?._id || "",
          note: "",
          resolutionNote: "",
          rejectionReason: "",
        });
      })
      .catch((e) => setError(e.message));
  }, [issueId]);

  useEffect(() => {
    if (!form.dept) return setStaff([]);
    api
      .users({ role: "staff", department: form.dept })
      .then((r) => setStaff(r.items))
      .catch(() => setStaff([]));
  }, [form.dept]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (status?: IssueStatus) => {
    if (!issue) return;
    const data: IssueUpdate = {};
    if (form.category !== issue.category) data.category = form.category;
    if (form.urgency !== issue.urgency) data.urgency = form.urgency;
    if (isAdmin && form.dept !== (issue.assignedDepartment?._id || "")) data.assignedDepartment = form.dept || null;
    if (form.assignee !== (issue.assignedTo?._id || "")) data.assignedTo = form.assignee || null;
    if (form.note.trim()) data.note = form.note.trim();
    if (status) data.status = status;
    if (status === "resolved" && form.resolutionNote.trim()) data.resolutionNote = form.resolutionNote.trim();
    if (status === "rejected") data.rejectionReason = form.rejectionReason.trim();
    if (!Object.keys(data).length && !proof.length) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateIssue(issue.id, data, proof);
      setIssue(updated);
      setProof([]);
      setRejecting(false);
      setForm((f) => ({ ...f, note: "", resolutionNote: "", rejectionReason: "" }));
      onChanged(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!issue || !confirm("Permanently delete this report and its media?")) return;
    setBusy(true);
    try {
      await api.deleteIssue(issue.id);
      onChanged(null);
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const staffDeptId = user?.department && typeof user.department === "object" ? user.department._id : user?.department;
  const canEdit = isAdmin || (!!issue && issue.assignedDepartment?._id === staffDeptId);
  const next = issue ? NEXT[issue.status] : undefined;
  const dup = issue?.possibleDuplicateOf && typeof issue.possibleDuplicateOf === "object" ? issue.possibleDuplicateOf : null;

  return (
    <div className="fixed inset-0 z-[1300] flex justify-end" role="dialog" aria-modal="true" aria-label="Report details">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white z-10 border-b border-gray-200 px-5 py-3 flex items-center gap-3">
          <p className="text-sm text-gray-500">#{issueId.slice(-6).toUpperCase()}</p>
          {issue && <StatusBadge status={issue.status} />}
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!issue ? (
          error ? <p className="p-5 text-red-700">{error}</p> : <Spinner />
        ) : (
          <div className="p-5 space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{issue.title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {issue.categoryLabel} · reported {timeAgo(issue.createdAt)} by {issue.reporter?.name || issue.reporterUser?.fullName || "citizen"}
                {issue.reporter?.phone ? ` (${issue.reporter.phone})` : ""}
              </p>
              <div className="flex flex-wrap gap-2 mt-2 items-center">
                <UrgencyBadge urgency={issue.urgency} />
                <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                  <ThumbsUp size={12} /> {issue.upvoteCount} upvotes
                </span>
                <span className={`inline-flex items-center gap-1 text-xs ${issue.communityVerified ? "text-green-700 font-medium" : "text-gray-600"}`}>
                  <ShieldCheck size={12} /> {issue.communityConfirmations} confirm · {issue.communityDisputes} dispute
                </span>
                {issue.duplicateCount > 0 && <span className="text-xs text-gray-600">{issue.duplicateCount} duplicate reports linked</span>}
              </div>
              {dup && (
                <p className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-2.5 flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" /> Possible duplicate of "{dup.title}" ({STATUS_LABEL[dup.status]}), reported within 50 m. Consider rejecting as duplicate.
                </p>
              )}
              {issue.description && <p className="text-gray-700 mt-3 whitespace-pre-line">{issue.description}</p>}
            </div>

            {issue.attachments.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {issue.attachments.map((a) => (
                  <a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {a.mimetype.startsWith("video/") ? <video src={a.url} className="w-full h-full object-cover" muted /> : <img src={a.url} alt="" className="w-full h-full object-cover" />}
                  </a>
                ))}
              </div>
            )}

            {issue.coordinates && (
              <div>
                <p className="text-sm text-gray-700 flex items-start gap-1 mb-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" /> {issue.location || "—"} {issue.ward && <span className="text-gray-500">· Ward: {issue.ward}</span>}
                </p>
                <MapContainer center={[issue.coordinates.lat, issue.coordinates.lng]} zoom={16} className="h-40 rounded-lg z-0" scrollWheelZoom={false}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[issue.coordinates.lat, issue.coordinates.lng]} icon={pinIcon(issue.status)} />
                </MapContainer>
                <a className="inline-flex items-center gap-1 text-sm text-green-700 mt-2" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${issue.coordinates.lat},${issue.coordinates.lng}`}>
                  Directions for field team <ExternalLink size={12} />
                </a>
              </div>
            )}

            {canEdit ? (
              <section className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Action</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-gray-600">
                    Category
                    <select className={`${select} w-full mt-1`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-600">
                    Urgency
                    <select className={`${select} w-full mt-1`} value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}>
                      {(["low", "medium", "high", "critical"] as Urgency[]).map((u) => (
                        <option key={u} value={u}>
                          {URGENCY_LABEL[u]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-600">
                    Department
                    <select className={`${select} w-full mt-1`} value={form.dept} disabled={!isAdmin} onChange={(e) => setForm({ ...form, dept: e.target.value, assignee: "" })}>
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-gray-600">
                    Field worker
                    <select className={`${select} w-full mt-1`} value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })}>
                      <option value="">Not assigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <textarea className={`${input} resize-none`} rows={2} placeholder="Internal note / update for the citizen (shown on timeline)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                {issue.status === "in-progress" && (
                  <>
                    <textarea className={`${input} resize-none`} rows={2} placeholder="Resolution note (what was done)" value={form.resolutionNote} onChange={(e) => setForm({ ...form, resolutionNote: e.target.value })} />
                    <label className={`${btnSecondary} cursor-pointer w-full`}>
                      <Upload size={16} /> {proof.length ? `${proof.length} proof photo(s) selected` : "Attach proof of work"}
                      <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => setProof(Array.from(e.target.files || []).slice(0, 5))} />
                    </label>
                  </>
                )}
                {rejecting && (
                  <input className={input} autoFocus placeholder="Reason for rejection (sent to citizen)" value={form.rejectionReason} onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })} />
                )}
                {error && <p className="text-sm text-red-700">{error}</p>}
                <div className="flex flex-wrap gap-2">
                  {next && !rejecting && (
                    <button className={btnPrimary} disabled={busy} onClick={() => submit(next.to)}>
                      {next.label}
                    </button>
                  )}
                  {!rejecting && (
                    <button className={btnSecondary} disabled={busy} onClick={() => submit()}>
                      Save changes
                    </button>
                  )}
                  {["pending", "verified"].includes(issue.status) &&
                    (rejecting ? (
                      <>
                        <button className={btnDanger} disabled={busy || form.rejectionReason.trim().length < 3} onClick={() => submit("rejected")}>
                          Confirm rejection
                        </button>
                        <button className={btnSecondary} onClick={() => setRejecting(false)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className={btnDanger} disabled={busy} onClick={() => setRejecting(true)}>
                        Reject
                      </button>
                    ))}
                  {["resolved", "closed", "rejected"].includes(issue.status) && (
                    <button className={btnSecondary} disabled={busy} onClick={() => submit("in-progress")}>
                      Reopen
                    </button>
                  )}
                  {isAdmin && (
                    <button className={`${btnDanger} ml-auto`} disabled={busy} onClick={remove} aria-label="Delete report">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </section>
            ) : (
              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">This report belongs to another department; you can view it but not change it.</p>
            )}

            {issue.feedback && (
              <div className={`text-sm rounded-lg p-3 ${issue.feedback.satisfied ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"}`}>
                Citizen feedback: {issue.feedback.satisfied ? "satisfied" : "not satisfied"}
                {issue.feedback.rating ? ` · ${"★".repeat(issue.feedback.rating)}` : ""}
                {issue.feedback.comment ? ` · "${issue.feedback.comment}"` : ""}
              </div>
            )}

            <section>
              <h3 className="font-semibold text-gray-900 mb-3">Timeline</h3>
              <ol className="border-l-2 border-gray-200 ml-1.5 space-y-3">
                {[...issue.timeline].reverse().map((t, i) => (
                  <li key={i} className="ml-4 relative">
                    <span className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-white border-2 border-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{STATUS_LABEL[t.status]}</p>
                    {t.note && <p className="text-sm text-gray-600">{t.note}</p>}
                    <p className="text-xs text-gray-400">
                      {formatDateTime(t.at)}
                      {t.byName ? ` · ${t.byName}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDrawer;
