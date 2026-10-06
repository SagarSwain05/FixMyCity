import { Response } from "express";
import { z } from "zod";
import User from "../models/User";
import { AuthenticatedRequest } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { publicUser } from "./auth.controller";
import { storeFiles } from "../utils/storage";

const updateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().toLowerCase().email().optional(),
    address: z
      .object({ street: z.string(), city: z.string(), state: z.string(), zip: z.string() })
      .partial()
      .optional(),
    avatarUrl: z.string().url().optional(),
    emailNotifications: z.boolean().optional(),
  })
  .strict();

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  res.json(publicUser(req.user!));
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const data = updateSchema.parse(req.body);
  const user = req.user!;
  if (data.email && data.email !== user.email && (await User.exists({ email: data.email }))) {
    throw new HttpError(409, "Email already in use");
  }
  if (data.fullName !== undefined) user.fullName = data.fullName;
  if (data.email !== undefined) user.email = data.email;
  if (data.avatarUrl !== undefined) user.avatarUrl = data.avatarUrl;
  if (data.emailNotifications !== undefined) user.emailNotifications = data.emailNotifications;
  if (data.address) user.address = { ...user.address, ...data.address } as any;
  await user.save();
  res.json({ success: true, data: publicUser(user) });
}

export async function uploadAvatar(req: AuthenticatedRequest, res: Response) {
  const file = req.file;
  if (!file || !file.mimetype.startsWith("image/")) throw new HttpError(400, "Please upload an image");
  const [stored] = await storeFiles([file]);
  req.user!.avatarUrl = stored.url;
  await req.user!.save();
  res.json({ success: true, data: publicUser(req.user!) });
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  const data = passwordSchema.parse(req.body);
  const user = await User.findById(req.user!._id).select("+password");
  if (!user || !(await user.comparePassword(data.currentPassword))) {
    throw new HttpError(400, "Current password is incorrect");
  }
  user.password = data.newPassword;
  await user.save();
  res.json({ success: true, message: "Password updated" });
}
