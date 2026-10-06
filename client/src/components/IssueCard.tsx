import React from "react";
import { MapPin, ThumbsUp, ShieldCheck, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Issue } from "../lib/api";
import { CATEGORY_EMOJI, URGENCY_BORDER, URGENCY_LABEL, timeAgo } from "../lib/format";
import { StatusBadge } from "./ui";

interface Props {
  issue: Issue;
  onClick?: () => void;
  onUpvote?: () => void;
  distance?: string;
}

const IssueCard: React.FC<Props> = ({ issue, onClick, onUpvote, distance }) => {
  const image = issue.attachments.find((a) => a.mimetype.startsWith("image/"))?.url;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 ${URGENCY_BORDER[issue.urgency]} overflow-hidden`}
    >
      <button onClick={onClick} className="w-full text-left p-4 flex gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl">
        {image ? (
          <img src={image} alt="" loading="lazy" className="w-20 h-20 rounded-lg object-cover shrink-0 bg-gray-100" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center text-3xl">
            {CATEGORY_EMOJI[issue.category]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug line-clamp-2">{issue.title}</h3>
            <StatusBadge status={issue.status} />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {issue.categoryLabel} · {URGENCY_LABEL[issue.urgency]} urgency · {timeAgo(issue.createdAt)}
          </p>
          {issue.location && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1.5 flex items-center gap-1 min-w-0">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{issue.ward || issue.location}</span>
              {distance && <span className="shrink-0 text-gray-400">· {distance}</span>}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
            {issue.communityVerified && (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                <ShieldCheck size={12} /> Community verified
              </span>
            )}
            {issue.assignedDepartment && (
              <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                <Building2 size={12} /> {issue.assignedDepartment.code}
              </span>
            )}
          </div>
        </div>
      </button>
      {onUpvote && (
        <div className="px-4 pb-3 -mt-1 flex justify-end">
          <button
            onClick={onUpvote}
            disabled={issue.isOwner}
            title={issue.isOwner ? "You reported this" : issue.hasUpvoted ? "Remove upvote" : "I see this too"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
              issue.hasUpvoted
                ? "bg-primary-600 border-primary-600 text-white"
                : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary-500"
            }`}
          >
            <ThumbsUp size={14} /> {issue.upvoteCount}
          </button>
        </div>
      )}
    </motion.article>
  );
};

export default IssueCard;
