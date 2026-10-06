import { Response } from "express";
import { Notification } from "../models/Notification";
import { AuthenticatedRequest } from "../middleware/auth";

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user!._id }).sort({ createdAt: -1 }).limit(limit).populate({ path: "issue", select: "title status" }),
    Notification.countDocuments({ user: req.user!._id, read: false }),
  ]);
  res.json({ items, unread });
}

export async function markRead(req: AuthenticatedRequest, res: Response) {
  await Notification.updateOne({ _id: req.params.id, user: req.user!._id }, { read: true });
  res.json({ success: true });
}

export async function markAllRead(req: AuthenticatedRequest, res: Response) {
  await Notification.updateMany({ user: req.user!._id, read: false }, { read: true });
  res.json({ success: true });
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  await Notification.deleteOne({ _id: req.params.id, user: req.user!._id });
  res.json({ success: true });
}
