import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { api, type Issue, type Urgency } from "../lib/api";
import { CATEGORY_EMOJI, timeAgo } from "../lib/format";
import { distanceMeters, formatDistance, type LatLng } from "../lib/geo";
import { useNotifications } from "../contexts/NotificationContext";

// Crowd-sourced verification prompt: asks citizens nearby to confirm new reports.
const VerifyNearbyCard: React.FC<{ issues: Issue[]; position: LatLng; onDone: (id: string) => void }> = ({ issues, position, onDone }) => {
  const navigate = useNavigate();
  const { toast } = useNotifications();
  const [busy, setBusy] = useState(false);
  const [severity, setSeverity] = useState<Urgency | undefined>();
  const issue = issues[0];
  if (!issue) return null;

  const vote = async (verdict: "confirm" | "dispute") => {
    setBusy(true);
    try {
      const r = await api.verify(issue.id, verdict, verdict === "confirm" ? severity : undefined);
      toast({
        title: "Thanks for verifying! +2 points",
        message: r.communityVerified ? "This report is now community-verified." : "Your neighbours' reports get to officials faster.",
        tone: "success",
      });
      setSeverity(undefined);
      onDone(issue.id);
    } catch (e) {
      toast({ title: "Could not submit", message: (e as Error).message, tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const image = issue.attachments.find((a) => a.mimetype.startsWith("image/"))?.url;
  const dist = issue.coordinates ? formatDistance(distanceMeters(position, issue.coordinates)) : null;

  return (
    <section className="bg-gradient-to-br from-emerald-50 to-sky-50 dark:from-emerald-950/40 dark:to-sky-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
        <h2 className="font-semibold text-gray-900 dark:text-white flex-1">Help verify nearby reports</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{issues.length} waiting</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={issue.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
          <button onClick={() => navigate(`/issues/${issue.id}`)} className="flex gap-3 text-left w-full">
            {image ? (
              <img src={image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center text-2xl shrink-0">{CATEGORY_EMOJI[issue.category]}</div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-sm text-gray-900 dark:text-white">{issue.title}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                {issue.categoryLabel} · {dist ? `${dist} away · ` : ""}
                {timeAgo(issue.createdAt)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{issue.communityConfirmations} confirmations so far</p>
            </div>
          </button>
          <p className="text-sm text-gray-700 dark:text-gray-200 mt-3">Have you seen this problem? How serious is it?</p>
          <div className="flex gap-1.5 mt-2">
            {(["low", "medium", "high", "critical"] as Urgency[]).map((u) => (
              <button
                key={u}
                onClick={() => setSeverity(severity === u ? undefined : u)}
                className={`flex-1 text-xs py-1.5 rounded-lg border capitalize ${
                  severity === u ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900" : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button disabled={busy} onClick={() => vote("confirm")} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-60">
              <ThumbsUp size={16} /> Yes, it's there
            </button>
            <button disabled={busy} onClick={() => vote("dispute")} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 text-sm font-medium py-2 rounded-lg disabled:opacity-60">
              <ThumbsDown size={16} /> Not there
            </button>
            <button disabled={busy} onClick={() => onDone(issue.id)} aria-label="Skip" className="px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <X size={18} />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
};

export default VerifyNearbyCard;
