import React, { useEffect, useState } from "react";
import { Trophy, Star, Gift, Medal, Zap, CheckCircle2, Eye, Award } from "lucide-react";
import { motion } from "framer-motion";
import { api, type RewardTransaction, type RewardsSummary } from "../lib/api";
import { timeAgo } from "../lib/format";
import { ErrorBanner, PageHeader, Spinner } from "../components/ui";

const ICONS: Record<string, React.ElementType> = { star: Star, trophy: Trophy, gift: Gift, medal: Medal, zap: Zap, check: CheckCircle2, eye: Eye };

const REASON: Record<string, string> = {
  ISSUE_REPORTED: "Reported an issue",
  ISSUE_VERIFIED: "Report verified by officials",
  ISSUE_RESOLVED: "Your report was resolved",
  ISSUE_REJECTED: "Report rejected",
  COMMUNITY_VERIFICATION: "Verified a nearby report",
  WEEKLY_BONUS: "Weekly Warrior bonus",
  ADJUSTMENT: "Adjustment",
};

const RewardsPage: React.FC = () => {
  const [data, setData] = useState<RewardsSummary | null>(null);
  const [tx, setTx] = useState<RewardTransaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"leaderboard" | "history">("leaderboard");

  useEffect(() => {
    api.rewards().then(setData).catch((e) => setError(e.message));
    api.rewardTransactions().then(setTx).catch(() => undefined);
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Spinner label="Loading rewards…" />;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <PageHeader title="Rewards & leaderboard" subtitle="Civic duty, gamified" />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary-600 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">Your reputation</p>
            <p className="text-4xl font-bold mt-1">{data.points}</p>
            <p className="text-primary-100 text-sm mt-1">{data.rank ? `Rank #${data.rank} citywide` : "Start reporting to get ranked"}</p>
          </div>
          <Trophy size={56} className="text-amber-300" />
        </div>
        <div className="grid grid-cols-4 gap-2 mt-5 text-center">
          {[
            ["Reports", data.stats.reports],
            ["Verified", data.stats.verified],
            ["Resolved", data.stats.resolved],
            ["Checks", data.stats.communityChecks],
          ].map(([l, v]) => (
            <div key={l} className="bg-white/10 rounded-lg py-2">
              <p className="text-lg font-bold">{v}</p>
              <p className="text-[11px] text-primary-100">{l}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.achievements.map((a) => {
            const Icon = ICONS[a.icon] || Award;
            return (
              <div key={a.title} className={`p-3 rounded-xl border ${a.earned ? "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700" : "border-gray-200 dark:border-gray-700 opacity-60"}`}>
                <Icon size={22} className={a.earned ? "text-amber-600 dark:text-amber-400" : "text-gray-400"} />
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1.5">{a.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex gap-2 mb-4" role="tablist">
          {(["leaderboard", "history"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${tab === t ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "text-gray-600 dark:text-gray-300"}`}
            >
              {t === "leaderboard" ? "Top citizens" : "Points history"}
            </button>
          ))}
        </div>
        {tab === "leaderboard" ? (
          <ol className="space-y-2">
            {data.leaderboard.map((u) => (
              <li key={u.userId} className={`flex items-center gap-3 p-2.5 rounded-lg ${u.isCurrentUser ? "bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-300 dark:ring-primary-700" : ""}`}>
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    u.rank === 1 ? "bg-amber-400 text-amber-950" : u.rank === 2 ? "bg-gray-300 text-gray-800" : u.rank === 3 ? "bg-orange-400 text-orange-950" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {u.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {u.name} {u.isCurrentUser && <span className="text-xs text-primary-700 dark:text-primary-400">(you)</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {u.city} · {u.reports} reports · {u.resolved} resolved
                  </p>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">{u.points}</span>
              </li>
            ))}
          </ol>
        ) : tx.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No points yet. Report an issue to earn your first 5.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {tx.map((t) => (
              <li key={t._id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm text-gray-900 dark:text-white">{REASON[t.reason] || t.reason}</p>
                  <p className="text-xs text-gray-400">{timeAgo(t.createdAt)}</p>
                </div>
                <span className={`font-semibold ${t.points > 0 ? "text-primary-700 dark:text-primary-400" : "text-red-600"}`}>
                  {t.points > 0 ? "+" : ""}
                  {t.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-2">How to earn points</h2>
        <ul className="grid sm:grid-cols-2 gap-1.5">
          <li>📸 Report an issue: <b>+5</b></li>
          <li>✅ Officials verify it: <b>+10</b></li>
          <li>🛠️ It gets resolved: <b>+5</b></li>
          <li>👀 Verify a report near you: <b>+2</b></li>
          <li>⚡ 5+ reports in a week: <b>+20</b></li>
          <li>🚫 Report rejected as spam: <b>−5</b></li>
        </ul>
      </section>
    </div>
  );
};

export default RewardsPage;
