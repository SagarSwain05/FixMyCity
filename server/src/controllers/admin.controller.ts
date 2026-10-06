import { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { Department } from "../models/Department";
import { Issue } from "../models/Issue";
import User from "../models/User";
import { CATEGORIES, OPEN_STATUSES } from "../constants";
import { getAnalytics } from "../services/analytics.service";
import { addressSchema, phoneSchema, publicUser } from "./auth.controller";

export async function analytics(req: AuthenticatedRequest, res: Response) {
  const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
  // Staff analytics are scoped to their department.
  const departmentId =
    req.user!.role === "staff" && req.user!.department
      ? String(req.user!.department)
      : typeof req.query.department === "string" && Types.ObjectId.isValid(req.query.department)
        ? req.query.department
        : undefined;
  res.json(await getAnalytics({ days, departmentId }));
}

// ----- departments -----

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(10),
  description: z.string().trim().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  categories: z.array(z.enum(CATEGORIES)).default([]),
  contactEmail: z.string().email().optional().or(z.literal("")),
  head: z.string().trim().max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function listDepartments(_req: AuthenticatedRequest, res: Response) {
  const [depts, issueStats, staffCounts] = await Promise.all([
    Department.find().sort({ name: 1 }),
    Issue.aggregate([
      {
        $group: {
          _id: "$assignedDepartment",
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
        },
      },
    ]),
    User.aggregate([{ $match: { role: "staff" } }, { $group: { _id: "$department", count: { $sum: 1 } } }]),
  ]);
  const stats = new Map(issueStats.map((s) => [String(s._id), s]));
  const staff = new Map(staffCounts.map((s) => [String(s._id), s.count]));
  res.json(
    depts.map((d) => ({
      ...d.toJSON(),
      staffCount: staff.get(String(d._id)) || 0,
      totalReports: stats.get(String(d._id))?.total || 0,
      activeReports: stats.get(String(d._id))?.open || 0,
      resolvedReports: stats.get(String(d._id))?.resolved || 0,
    }))
  );
}

export async function createDepartment(req: AuthenticatedRequest, res: Response) {
  const data = departmentSchema.parse(req.body);
  res.status(201).json(await Department.create(data));
}

export async function updateDepartment(req: AuthenticatedRequest, res: Response) {
  const data = departmentSchema.partial().parse(req.body);
  const dept = await Department.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!dept) throw new HttpError(404, "Department not found");
  res.json(dept);
}

export async function deleteDepartment(req: AuthenticatedRequest, res: Response) {
  const open = await Issue.countDocuments({ assignedDepartment: req.params.id, status: { $in: OPEN_STATUSES } });
  if (open) throw new HttpError(400, `Department still has ${open} open issues. Reassign them first.`);
  await User.updateMany({ department: req.params.id }, { department: null });
  await Department.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}

// ----- users / staff -----

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  role: z.enum(["staff", "admin"]).default("staff"),
  department: z.string().nullable().optional(),
  address: addressSchema.partial().optional(),
});

const updateUserSchema = z.object({
  role: z.enum(["citizen", "staff", "admin"]).optional(),
  department: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().trim().min(2).max(100).optional(),
});

export async function listUsers(req: AuthenticatedRequest, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.role) filter.role = { $in: String(req.query.role).split(",") };
  if (req.query.department) filter.department = req.query.department;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate({ path: "department", select: "name code color" }),
    User.countDocuments(filter),
  ]);
  res.json({ items: items.map(publicUser), total, page, pages: Math.ceil(total / limit) });
}

export async function createStaff(req: AuthenticatedRequest, res: Response) {
  const data = createStaffSchema.parse(req.body);
  if (await User.exists({ $or: [{ phone: data.phone }, { email: data.email }] })) {
    throw new HttpError(409, "A user with this phone or email already exists");
  }
  const user = await User.create({
    ...data,
    department: data.department || null,
    address: { street: "", city: "", state: "", zip: "", ...(data.address || {}) },
    isPhoneVerified: true,
  });
  res.status(201).json(publicUser(user));
}

export async function updateUser(req: AuthenticatedRequest, res: Response) {
  const data = updateUserSchema.parse(req.body);
  if (String(req.params.id) === String(req.user!._id) && (data.role || data.isActive === false)) {
    throw new HttpError(400, "You cannot change your own role or deactivate yourself");
  }
  const user = await User.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).populate({
    path: "department",
    select: "name code color",
  });
  if (!user) throw new HttpError(404, "User not found");
  res.json(publicUser(user));
}
