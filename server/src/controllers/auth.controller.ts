import { Response } from "express";
import { z } from "zod";
import User, { IUser } from "../models/User";
import { AuthenticatedRequest, generateToken } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { notify } from "../services/notification.service";

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .transform((v) => (/^\d{10}$/.test(v) ? `+91${v}` : v))
  .pipe(z.string().regex(/^\+91[0-9]{10}$/, "Please provide a valid 10-digit Indian mobile number"));

export const addressSchema = z.object({
  street: z.string().trim().default(""),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().default(""),
  zip: z.string().trim().default(""),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  address: addressSchema,
});

// `identifier` may be a phone number or an email. `phone` is kept for older clients.
const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    password: z.string().min(1, "Password is required"),
  })
  .refine((d) => d.identifier || d.phone, { message: "Phone or email is required", path: ["identifier"] });

export function publicUser(u: IUser) {
  return {
    id: u._id.toString(),
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    role: u.role,
    department: u.department ?? null,
    address: u.address,
    avatarUrl: u.avatarUrl || null,
    points: u.points,
    emailNotifications: u.emailNotifications,
    isPhoneVerified: u.isPhoneVerified,
    createdAt: u.createdAt,
  };
}

export async function signup(req: AuthenticatedRequest, res: Response) {
  const data = signupSchema.parse(req.body);
  const existing = await User.findOne({ $or: [{ phone: data.phone }, { email: data.email }] });
  if (existing) throw new HttpError(409, "An account with this phone number or email already exists");

  const user = await User.create({ ...data, role: "citizen" });
  await notify({
    userId: user._id,
    type: "system",
    title: "Welcome to FixMyCity!",
    message: "Report your first civic issue to earn points and climb the leaderboard.",
  });
  res.status(201).json({
    success: true,
    data: { accessToken: generateToken(user), user: publicUser(user) },
  });
}

export async function login(req: AuthenticatedRequest, res: Response) {
  const data = loginSchema.parse(req.body);
  const raw = (data.identifier || data.phone)!;
  const query = raw.includes("@")
    ? { email: raw.toLowerCase() }
    : { phone: phoneSchema.safeParse(raw).success ? phoneSchema.parse(raw) : raw };

  const user = await User.findOne(query).select("+password");
  if (!user || !(await user.comparePassword(data.password))) {
    throw new HttpError(401, "Invalid credentials");
  }
  if (!user.isActive) throw new HttpError(403, "This account has been deactivated");

  user.lastLoginAt = new Date();
  await user.save();
  res.json({ success: true, data: { accessToken: generateToken(user), user: publicUser(user) } });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  await req.user!.populate({ path: "department", select: "name code color" });
  res.json(publicUser(req.user!));
}
