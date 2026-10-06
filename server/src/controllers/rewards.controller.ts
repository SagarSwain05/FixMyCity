import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { getLeaderboard, getUserRewards, getUserTransactions } from "../services/rewards.service";

export async function getMyRewards(req: AuthenticatedRequest, res: Response) {
  const data = await getUserRewards(req.user!._id.toString());
  if (!data) return res.status(404).json({ success: false, message: "User not found" });
  res.json(data);
}

export async function getMyRewardTransactions(req: AuthenticatedRequest, res: Response) {
  res.json(await getUserTransactions(req.user!._id.toString(), 100));
}

export async function leaderboard(req: AuthenticatedRequest, res: Response) {
  const limit = Math.min(100, Number(req.query.limit) || 20);
  res.json(await getLeaderboard(limit, req.query.city ? String(req.query.city) : undefined));
}
