import { Types } from "mongoose";
import User from "../models/User";
import { RewardTransaction, RewardReason } from "../models/RewardTransaction";
import { Issue } from "../models/Issue";
import { POINTS } from "../constants";
import { notify } from "./notification.service";

export async function awardPoints(
  userId: Types.ObjectId | string,
  points: number,
  reason: RewardReason,
  meta?: Record<string, unknown>
) {
  if (!points) return;
  const user = await User.findById(userId);
  if (!user || user.role !== "citizen") return;
  user.points = Math.max(0, (user.points || 0) + points);
  await user.save();
  await RewardTransaction.create({ user: user._id, points, reason, meta });
  if (points > 0 && reason !== "COMMUNITY_VERIFICATION") {
    await notify({
      userId: user._id,
      type: "reward",
      title: `+${points} points earned`,
      message: rewardMessage(reason, points),
      issueId: (meta?.issueId as string) || null,
    });
  }
  return user.points;
}

function rewardMessage(reason: RewardReason, points: number) {
  switch (reason) {
    case "ISSUE_REPORTED":
      return `Thanks for reporting! You earned ${points} points.`;
    case "ISSUE_VERIFIED":
      return `Your report was verified by city officials. You earned ${points} points.`;
    case "ISSUE_RESOLVED":
      return `An issue you reported has been resolved. You earned ${points} bonus points.`;
    case "WEEKLY_BONUS":
      return `Weekly Warrior! 5+ reports this week earned you ${points} points.`;
    default:
      return `You earned ${points} points.`;
  }
}

export async function checkAndAwardWeeklyBonus(userId: Types.ObjectId | string) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const weeklyReports = await Issue.countDocuments({ reporterUser: userId, createdAt: { $gte: weekAgo } });
  if (weeklyReports < 5) return false;
  const existing = await RewardTransaction.findOne({
    user: userId,
    reason: "WEEKLY_BONUS",
    createdAt: { $gte: weekAgo },
  });
  if (existing) return false;
  await awardPoints(userId, POINTS.WEEKLY_BONUS, "WEEKLY_BONUS", { weeklyReports });
  return true;
}

export async function getLeaderboard(limit = 20, city?: string) {
  const filter: Record<string, unknown> = { role: "citizen", isActive: true };
  if (city) filter["address.city"] = new RegExp(`^${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  const top = await User.find(filter)
    .sort({ points: -1, createdAt: 1 })
    .limit(limit)
    .select("fullName points address.city avatarUrl")
    .lean();
  const ids = top.map((u) => u._id);
  const counts = await Issue.aggregate([
    { $match: { reporterUser: { $in: ids } } },
    {
      $group: {
        _id: "$reporterUser",
        reports: { $sum: 1 },
        resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
      },
    },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c]));
  return top.map((u, i) => ({
    rank: i + 1,
    userId: String(u._id),
    name: u.fullName,
    city: u.address?.city || "-",
    avatarUrl: u.avatarUrl || null,
    points: u.points || 0,
    reports: byId.get(String(u._id))?.reports || 0,
    resolved: byId.get(String(u._id))?.resolved || 0,
  }));
}

export async function getUserRewards(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const rank =
    user.role === "citizen"
      ? (await User.countDocuments({ role: "citizen", isActive: true, points: { $gt: user.points || 0 } })) + 1
      : 0;

  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [reports, resolved, verified, weekly, communityChecks, leaderboard] = await Promise.all([
    Issue.countDocuments({ reporterUser: userId }),
    Issue.countDocuments({ reporterUser: userId, status: { $in: ["resolved", "closed"] } }),
    Issue.countDocuments({ reporterUser: userId, verifiedAt: { $exists: true } }),
    Issue.countDocuments({ reporterUser: userId, createdAt: { $gte: weekAgo } }),
    Issue.countDocuments({ "communityVotes.user": userId }),
    getLeaderboard(10),
  ]);

  const achievements = [
    { icon: "star", title: "First Report", description: "Submitted your first issue report", earned: reports >= 1 },
    { icon: "check", title: "Trusted Reporter", description: "5 reports verified by officials", earned: verified >= 5 },
    { icon: "trophy", title: "Problem Solver", description: "Reported 10+ issues", earned: reports >= 10 },
    { icon: "eye", title: "Neighbourhood Watch", description: "Verified 10 issues near you", earned: communityChecks >= 10 },
    { icon: "medal", title: "Community Hero", description: "Top 5 on the leaderboard", earned: rank > 0 && rank <= 5 },
    { icon: "zap", title: "Weekly Warrior", description: "5+ reports in one week", earned: weekly >= 5 },
    { icon: "gift", title: "City Champion", description: "25+ of your reports resolved", earned: resolved >= 25 },
  ];

  return {
    points: user.points || 0,
    rank,
    city: user.address?.city || "-",
    stats: { reports, resolved, verified, communityChecks },
    leaderboard: leaderboard.map((l) => ({ ...l, isCurrentUser: l.userId === String(user._id) })),
    achievements,
  };
}

export function getUserTransactions(userId: string, limit = 50) {
  return RewardTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(limit).lean();
}
