import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, ThumbsUp, ShieldCheck, Building2, UserCog, Trash2, Star, CheckCircle2, XCircle, Share2, Copy } from "lucide-react";
import { api, type Issue } from "../lib/api";
import { CATEGORY_EMOJI, STATUS_COLOR, STATUS_LABEL, URGENCY_LABEL, formatDateTime, timeAgo } from "../lib/format";
import IssueMap from "../components/IssueMap";
import { ErrorBanner, Spinner, StatusBadge, btnPrimary, btnSecondary, inputClass } from "../components/ui";
import { useNotifications } from "../contexts/NotificationContext";

const STEPS = ["pending", "verified", "in-progress", "resolved"] as const;

const IssueDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useNotifications();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeMedia, setActiveMedia] = useState(0);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const load = useCallback(() => {
    setError(null);
    api.getIssue(id!).then(setIssue).catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast({ title: success, message: "", tone: "success" });
      load();
    } catch (e) {
      toast({ title: "Something went wrong", message: (e as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorBanner message={error} onRetry={load} />;
  if (!issue) return <Spinner label="Loading report…" />;

  const media = issue.attachments;
  const current = media[activeMedia];
  const stepIndex = issue.status === "closed" ? 3 : STEPS.indexOf(issue.status as (typeof STEPS)[number]);
  const isOpen = ["pending", "verified", "in-progress"].includes(issue.status);
  const canVerify = !issue.isOwner && !issue.myVerification && isOpen;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: issue.title, text: `Help get this fixed: ${issue.title}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", message: "Share it with your neighbours.", tone: "success" });
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ArrowLeft size={22} />
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">Report #{issue.id.slice(-6).toUpperCase()}</span>
        <button onClick={share} className="ml-auto p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Share">
          {"share" in navigator ? <Share2 size={20} /> : <Copy size={20} />}
        </button>
      </div>

      {/* Media */}
      {media.length > 0 ? (
        <div>
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            {current.mimetype.startsWith("video/") ? (
              <video src={current.url} controls className="w-full h-full object-contain" />
            ) : (
              <img src={current.url} alt={issue.title} className="w-full h-full object-contain" />
            )}
          </div>
          {media.length > 1 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {media.map((m, i) => (
                <button key={m.url} onClick={() => setActiveMedia(i)} className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${i === activeMedia ? "border-primary-600" : "border-transparent"}`}>
                  {m.mimetype.startsWith("video/") ? <video src={m.url} className="w-full h-full object-cover" muted /> : <img src={m.url} alt="" className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-gray-100 dark:bg-gray-800 h-32 flex items-center justify-center text-5xl">{CATEGORY_EMOJI[issue.category]}</div>
      )}

      {/* Summary */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{issue.title}</h1>
          <StatusBadge status={issue.status} className="mt-1" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {CATEGORY_EMOJI[issue.category]} {issue.categoryLabel} · {URGENCY_LABEL[issue.urgency]} urgency · reported {timeAgo(issue.createdAt)}
          {issue.reporterUser?.fullName ? ` by ${issue.reporterUser.fullName}` : ""}
        </p>
        {issue.description && <p className="text-gray-700 dark:text-gray-200 mt-3 whitespace-pre-line">{issue.description}</p>}
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {issue.communityVerified && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-medium">
              <ShieldCheck size={14} /> Community verified
            </span>
          )}
          {issue.assignedDepartment && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <Building2 size={14} /> {issue.assignedDepartment.name}
            </span>
          )}
          {issue.assignedTo && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
              <UserCog size={14} /> {issue.assignedTo.fullName}
            </span>
          )}
        </div>
        {issue.possibleDuplicateOf && typeof issue.possibleDuplicateOf === "object" && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
            Linked to a similar report:{" "}
            <Link className="underline" to={`/issues/${issue.possibleDuplicateOf._id}`}>
              {issue.possibleDuplicateOf.title}
            </Link>
          </p>
        )}
        {issue.status === "rejected" && issue.rejectionReason && (
          <p className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mt-3">Rejected: {issue.rejectionReason}</p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            disabled={busy || issue.isOwner}
            onClick={() => act(() => api.upvote(issue.id))}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium border transition-colors disabled:opacity-60 ${
              issue.hasUpvoted ? "bg-primary-600 border-primary-600 text-white" : "border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100"
            }`}
          >
            <ThumbsUp size={18} /> {issue.hasUpvoted ? "Upvoted" : "I see this too"} · {issue.upvoteCount}
          </button>
          {issue.isOwner && issue.status === "pending" && (
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("Delete this report? This cannot be undone.")) act(() => api.deleteIssue(issue.id).then(() => navigate("/my-reports", { replace: true })));
              }}
              className="px-4 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300"
              aria-label="Delete report"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </section>

      {/* Crowd verification */}
      {canVerify && (
        <section className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-600" /> Can you confirm this?
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{issue.communityConfirmations} neighbours confirmed so far. Your check earns 2 points.</p>
          <div className="flex gap-2 mt-3">
            <button disabled={busy} onClick={() => act(() => api.verify(issue.id, "confirm"), "Thanks for confirming!")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-60">
              Yes, I've seen it
            </button>
            <button disabled={busy} onClick={() => act(() => api.verify(issue.id, "dispute"), "Thanks for the feedback")} className={`${btnSecondary} flex-1 text-sm py-2`}>
              It's not there
            </button>
          </div>
        </section>
      )}
      {issue.myVerification && (
        <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
          <ShieldCheck size={16} /> You {issue.myVerification === "confirm" ? "confirmed" : "disputed"} this report.
        </p>
      )}

      {/* Resolution feedback */}
      {issue.isOwner && issue.status === "resolved" && !issue.feedback && (
        <section className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 rounded-xl p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Was it fixed properly?</h2>
          {issue.resolutionNote && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Official note: {issue.resolutionNote}</p>}
          <div className="flex gap-1 mt-3" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} role="radio" aria-checked={rating === n}>
                <Star size={26} className={n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"} />
              </button>
            ))}
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} placeholder="Optional comment" className={`${inputClass} mt-3 resize-none`} />
          <div className="flex gap-2 mt-3">
            <button disabled={busy} onClick={() => act(() => api.feedback(issue.id, { satisfied: true, rating: rating || undefined, comment: comment || undefined }), "Thanks! Report closed.")} className={`${btnPrimary} flex-1 text-sm`}>
              <CheckCircle2 size={16} /> Yes, it's fixed
            </button>
            <button disabled={busy} onClick={() => act(() => api.feedback(issue.id, { satisfied: false, rating: rating || undefined, comment: comment || undefined }), "Report reopened")} className={`${btnSecondary} flex-1 text-sm`}>
              <XCircle size={16} /> Not fixed
            </button>
          </div>
        </section>
      )}

      {/* Progress */}
      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Progress</h2>
        {issue.status !== "rejected" && (
          <div className="flex items-center mb-6" aria-label={`Current stage: ${STATUS_LABEL[issue.status]}`}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= stepIndex ? "text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`} style={i <= stepIndex ? { background: STATUS_COLOR[s] } : undefined}>
                    {i + 1}
                  </div>
                  <span className="text-[10px] sm:text-xs mt-1 text-gray-600 dark:text-gray-300 whitespace-nowrap">{STATUS_LABEL[s]}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-1 mx-1 -mt-4 rounded ${i < stepIndex ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
              </React.Fragment>
            ))}
          </div>
        )}
        <ol className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-2 space-y-4">
          {[...issue.timeline].reverse().map((t, i) => (
            <li key={i} className="ml-4">
              <span className="absolute -left-[7px] w-3 h-3 rounded-full border-2 border-white dark:border-gray-800" style={{ background: STATUS_COLOR[t.status] }} />
              <p className="text-sm font-medium text-gray-900 dark:text-white">{STATUS_LABEL[t.status]}</p>
              {t.note && <p className="text-sm text-gray-600 dark:text-gray-300">{t.note}</p>}
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDateTime(t.at)}
                {t.byName ? ` · ${t.byName}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Location */}
      {issue.coordinates && (
        <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Location</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1 mb-3">
            <MapPin size={14} className="mt-0.5 shrink-0" /> {issue.location || `${issue.coordinates.lat.toFixed(5)}, ${issue.coordinates.lng.toFixed(5)}`}
          </p>
          <IssueMap
            issues={[{ ...issue, coordinates: issue.coordinates, thumbnail: null }]}
            center={issue.coordinates}
            zoom={16}
            className="h-48"
          />
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${issue.coordinates.lat},${issue.coordinates.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-3 text-sm font-medium text-primary-700 dark:text-primary-400"
          >
            Get directions →
          </a>
        </section>
      )}
    </div>
  );
};

export default IssueDetailPage;
