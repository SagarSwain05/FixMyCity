import { Response } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { Issue, IIssue } from "../models/Issue";
import User from "../models/User";
import { Department } from "../models/Department";
import { AuthenticatedRequest } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ISSUE_STATUSES,
  IssueStatus,
  OPEN_STATUSES,
  POINTS,
  URGENCIES,
  Urgency,
} from "../constants";
import { env } from "../config/env";
import { deleteStoredFiles, storeFiles } from "../utils/storage";
import { awardPoints, checkAndAwardWeeklyBonus } from "../services/rewards.service";
import { departmentForCategory, findNearbyOpenIssues, inferCategory } from "../services/routing.service";
import { notify } from "../services/notification.service";
import { broadcast, emitToStaff } from "../services/realtime";

// ---------- helpers ----------

// multipart/form-data sends nested objects as JSON strings
const jsonish = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, schema);

const num = z.preprocess((v) => (typeof v === "string" && v !== "" ? Number(v) : v), z.number());

const coordSchema = z.object({ lat: num.pipe(z.number().min(-90).max(90)), lng: num.pipe(z.number().min(-180).max(180)) });

const isStaff = (req: AuthenticatedRequest) => req.user?.role === "admin" || req.user?.role === "staff";

const URGENCY_RANK: Record<Urgency, number> = { low: 0, medium: 1, high: 2, critical: 3 };

const ISSUE_POPULATE = [
  { path: "assignedDepartment", select: "name code color" },
  { path: "assignedTo", select: "fullName phone email" },
  { path: "reporterUser", select: "fullName avatarUrl" },
];

// Shapes an issue for the viewer: hides voter lists and reporter contact details
// from the public, and adds per-viewer flags.
function serialize(issue: IIssue, viewer?: AuthenticatedRequest["user"]) {
  const json = issue.toJSON() as Record<string, any>;
  const viewerId = viewer ? String(viewer._id) : null;
  const staff = viewer?.role === "admin" || viewer?.role === "staff";
  const reporterId = json.reporterUser?._id ? String(json.reporterUser._id) : json.reporterUser ? String(json.reporterUser) : null;
  const isOwner = !!viewerId && viewerId === reporterId;

  const votes = (issue.communityVotes || []) as IIssue["communityVotes"];
  json.communityConfirmations = votes.filter((v) => v.verdict === "confirm").length;
  json.communityDisputes = votes.filter((v) => v.verdict === "dispute").length;
  json.hasUpvoted = viewerId ? (issue.upvotes || []).some((u) => String(u) === viewerId) : false;
  json.myVerification = viewerId ? votes.find((v) => String(v.user) === viewerId)?.verdict ?? null : null;
  json.isOwner = isOwner;
  json.categoryLabel = CATEGORY_LABELS[issue.category];

  delete json.upvotes;
  if (!staff) {
    delete json.communityVotes;
    if (!isOwner) {
      json.reporter = json.reporter?.name ? { name: json.reporter.name } : undefined;
      json.timeline = (json.timeline || []).map((t: any) => ({ status: t.status, note: t.note, at: t.at }));
    }
  }
  return json;
}

async function loadIssue(id: string) {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "Invalid issue id");
  const issue = await Issue.findById(id);
  if (!issue) throw new HttpError(404, "Issue not found");
  return issue;
}

function buildListFilter(req: AuthenticatedRequest) {
  const q = req.query as Record<string, string | undefined>;
  const filter: Record<string, any> = {};
  const csv = (v?: string) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []);

  const statuses = csv(q.status).filter((s) => (ISSUE_STATUSES as readonly string[]).includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  else if (q.status === "open") filter.status = { $in: OPEN_STATUSES };
  else if (!isStaff(req) && q.mine !== "true") filter.status = { $ne: "rejected" };

  const cats = csv(q.category).filter((c) => (CATEGORIES as readonly string[]).includes(c));
  if (cats.length) filter.category = { $in: cats };
  const urg = csv(q.urgency).filter((u) => (URGENCIES as readonly string[]).includes(u));
  if (urg.length) filter.urgency = { $in: urg };
  if (q.ward) filter.ward = q.ward;
  if (q.department && Types.ObjectId.isValid(q.department)) filter.assignedDepartment = new Types.ObjectId(q.department);
  if (q.department === "unassigned") filter.assignedDepartment = null;
  if (q.mine === "true" && req.user) filter.reporterUser = req.user._id;
  if (q.q) filter.$text = { $search: q.q };
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = new Date(q.from);
    if (q.to) filter.createdAt.$lte = new Date(q.to);
  }
  if (q.lat && q.lng) {
    const radius = Math.min(Number(q.radius) || 5000, 50000);
    filter.geo = {
      $geoWithin: { $centerSphere: [[Number(q.lng), Number(q.lat)], radius / 6378137] },
    };
  }
  // Staff only see their own department's queue.
  if (req.user?.role === "staff" && req.user.department) filter.assignedDepartment = req.user.department;
  return filter;
}

const SORTS: Record<string, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  upvotes: { upvoteCount: -1, createdAt: -1 },
  updated: { updatedAt: -1 },
};

// ---------- read ----------

export async function listIssues(req: AuthenticatedRequest, res: Response) {
  const filter = buildListFilter(req);
  const page = Math.max(1, parseInt(String(req.query.page)) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit)) || 20));
  const sort = SORTS[String(req.query.sort)] || SORTS.newest;

  const [items, total] = await Promise.all([
    Issue.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate(ISSUE_POPULATE),
    Issue.countDocuments(filter),
  ]);
  res.json({
    items: items.map((i) => serialize(i, req.user)),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

// Lightweight payload for plotting pins on a map.
export async function mapIssues(req: AuthenticatedRequest, res: Response) {
  const filter = { ...buildListFilter(req), "coordinates.lat": { $type: "number" } };
  const items = await Issue.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(2000, Number(req.query.limit) || 1000))
    .select("title category status urgency coordinates location ward upvoteCount createdAt attachments assignedDepartment communityVerified")
    .populate({ path: "assignedDepartment", select: "name color" })
    .lean();
  res.json(
    items.map((i) => ({
      id: String(i._id),
      title: i.title,
      category: i.category,
      categoryLabel: CATEGORY_LABELS[i.category],
      status: i.status,
      urgency: i.urgency,
      coordinates: i.coordinates,
      location: i.location,
      ward: i.ward,
      upvoteCount: i.upvoteCount,
      communityVerified: i.communityVerified,
      createdAt: i.createdAt,
      thumbnail: i.attachments?.find((a) => a.mimetype.startsWith("image/"))?.url || null,
      department: i.assignedDepartment,
    }))
  );
}

export async function getIssue(req: AuthenticatedRequest, res: Response) {
  const issue = await loadIssue(req.params.id);
  await issue.populate(ISSUE_POPULATE);
  if (issue.possibleDuplicateOf) await issue.populate({ path: "possibleDuplicateOf", select: "title status" });
  res.json(serialize(issue, req.user));
}

// Deduplication pre-check used by the report form before submitting.
export async function nearbyIssues(req: AuthenticatedRequest, res: Response) {
  const q = z
    .object({
      lat: num,
      lng: num,
      category: z.enum(CATEGORIES).optional(),
      radius: num.optional(),
    })
    .parse(req.query);
  const radius = Math.min(q.radius ?? env.duplicateRadiusMeters, 5000);
  const items = await findNearbyOpenIssues(q.lat, q.lng, { category: q.category, radius });
  res.json({ radius, items: items.map((i) => serialize(i, req.user)) });
}

// Crowd-sourced verification: pending issues near the user that they haven't reported or voted on.
export async function verifyQueue(req: AuthenticatedRequest, res: Response) {
  const q = z.object({ lat: num, lng: num }).parse(req.query);
  const items = await Issue.find({
    status: { $in: ["pending", "verified"] },
    communityVerified: false,
    reporterUser: { $ne: req.user!._id },
    "communityVotes.user": { $ne: req.user!._id },
    geo: {
      $near: { $geometry: { type: "Point", coordinates: [q.lng, q.lat] }, $maxDistance: env.verifyRadiusMeters },
    },
  }).limit(5);
  res.json(items.map((i) => serialize(i, req.user)));
}

export async function issueStats(_req: AuthenticatedRequest, res: Response) {
  const [byStatus, byUrgency, byCategory, total] = await Promise.all([
    Issue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: "$urgency", count: { $sum: 1 } } }]),
    Issue.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    Issue.countDocuments({}),
  ]);
  const rec = (rows: any[]) => Object.fromEntries(rows.map((x) => [x._id, x.count]));
  res.json({ total, byStatus: rec(byStatus), byUrgency: rec(byUrgency), byCategory: rec(byCategory) });
}

// ---------- create ----------

const createIssueBody = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(140),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(CATEGORIES).optional(),
  urgency: z.enum(URGENCIES).default("medium"),
  location: z.string().trim().max(500).optional(),
  ward: z.string().trim().max(120).optional(),
  coordinates: jsonish(coordSchema).optional(),
  reporter: jsonish(z.object({ name: z.string().optional() }).partial()).optional(),
});

export async function createIssue(req: AuthenticatedRequest, res: Response) {
  const body = createIssueBody.parse(req.body);
  const user = req.user!;
  const files = (req.files as Express.Multer.File[]) || [];

  const category = body.category ?? inferCategory(`${body.title} ${body.description || ""}`);
  const [attachments, assignedDepartment] = await Promise.all([
    storeFiles(files),
    departmentForCategory(category),
  ]);

  let possibleDuplicateOf: Types.ObjectId | null = null;
  if (body.coordinates) {
    const [dup] = await findNearbyOpenIssues(body.coordinates.lat, body.coordinates.lng, { category, limit: 1 });
    if (dup) possibleDuplicateOf = dup._id;
  }

  const issue = await Issue.create({
    ...body,
    category,
    attachments,
    assignedDepartment,
    possibleDuplicateOf,
    reporter: { name: body.reporter?.name || user.fullName, email: user.email, phone: user.phone },
    reporterUser: user._id,
    timeline: [{ status: "pending", note: "Issue reported", by: user._id, byName: user.fullName }],
  });

  if (possibleDuplicateOf) {
    await Issue.updateOne({ _id: possibleDuplicateOf }, { $inc: { duplicateCount: 1 } });
  }

  await awardPoints(user._id, POINTS.ISSUE_REPORTED, "ISSUE_REPORTED", { issueId: issue._id });
  await checkAndAwardWeeklyBonus(user._id);

  await issue.populate(ISSUE_POPULATE);
  const payload = serialize(issue, user);
  emitToStaff("issue:created", payload);
  broadcast("issue:changed", { id: payload.id, status: issue.status });
  res.status(201).json(payload);
}

// ---------- citizen interactions ----------

export async function toggleUpvote(req: AuthenticatedRequest, res: Response) {
  const userId = req.user!._id;
  const issue = await loadIssue(req.params.id);
  const has = issue.upvotes.some((u) => String(u) === String(userId));
  const updated = await Issue.findByIdAndUpdate(
    issue._id,
    has ? { $pull: { upvotes: userId }, $inc: { upvoteCount: -1 } } : { $addToSet: { upvotes: userId }, $inc: { upvoteCount: 1 } },
    { new: true }
  );
  broadcast("issue:changed", { id: String(issue._id), upvoteCount: updated!.upvoteCount });
  res.json({ upvoted: !has, upvoteCount: updated!.upvoteCount });
}

const communityVerifyBody = z.object({
  verdict: z.enum(["confirm", "dispute"]),
  severity: z.enum(URGENCIES).optional(),
});

export async function communityVerify(req: AuthenticatedRequest, res: Response) {
  const body = communityVerifyBody.parse(req.body);
  const user = req.user!;
  const issue = await loadIssue(req.params.id);

  if (String(issue.reporterUser) === String(user._id)) throw new HttpError(400, "You cannot verify your own report");
  if (!OPEN_STATUSES.includes(issue.status)) throw new HttpError(400, "This issue is no longer open");

  // Atomic guard so one user can only vote once even with concurrent requests.
  const updated = await Issue.findOneAndUpdate(
    { _id: issue._id, "communityVotes.user": { $ne: user._id } },
    { $push: { communityVotes: { user: user._id, verdict: body.verdict, severity: body.severity, at: new Date() } } },
    { new: true }
  );
  if (!updated) throw new HttpError(409, "You have already verified this issue");

  await awardPoints(user._id, POINTS.COMMUNITY_VERIFICATION, "COMMUNITY_VERIFICATION", { issueId: issue._id });

  const confirms = updated.communityVotes.filter((v) => v.verdict === "confirm");
  if (!updated.communityVerified && confirms.length >= env.communityVerifyThreshold) {
    updated.communityVerified = true;
    // Escalate urgency if the community rates it as more severe than the reporter did.
    const severities = confirms.map((v) => v.severity).filter(Boolean) as Urgency[];
    if (severities.length) {
      const top = severities.sort((a, b) => URGENCY_RANK[b] - URGENCY_RANK[a])[Math.floor(severities.length / 2)];
      if (URGENCY_RANK[top] > URGENCY_RANK[updated.urgency]) updated.urgency = top;
    }
    updated.timeline.push({ status: updated.status, note: `Confirmed by ${confirms.length} nearby citizens`, at: new Date() } as any);
    await updated.save();
    emitToStaff("issue:updated", { id: String(updated._id), communityVerified: true });
    if (updated.reporterUser) {
      await notify({
        userId: updated.reporterUser,
        type: "community",
        title: "Your report was confirmed by neighbours",
        message: `${confirms.length} people nearby confirmed "${updated.title}". It is now prioritised for officials.`,
        issueId: updated._id,
      });
    }
  }

  res.json({
    verdict: body.verdict,
    communityConfirmations: confirms.length,
    communityDisputes: updated.communityVotes.length - confirms.length,
    communityVerified: updated.communityVerified,
  });
}

const feedbackBody = z.object({
  satisfied: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(500).optional(),
});

// The reporter confirms a resolution (closes it) or says it isn't fixed (reopens it).
export async function submitFeedback(req: AuthenticatedRequest, res: Response) {
  const body = feedbackBody.parse(req.body);
  const user = req.user!;
  const issue = await loadIssue(req.params.id);
  if (String(issue.reporterUser) !== String(user._id)) throw new HttpError(403, "Only the reporter can give feedback");
  if (issue.status !== "resolved") throw new HttpError(400, "Feedback is only possible once the issue is resolved");

  issue.feedback = { ...body, at: new Date() };
  if (body.satisfied) {
    issue.status = "closed";
    issue.timeline.push({ status: "closed", note: "Reporter confirmed the fix", by: user._id, byName: user.fullName, at: new Date() });
  } else {
    issue.status = "in-progress";
    issue.resolvedAt = undefined;
    issue.timeline.push({
      status: "in-progress",
      note: `Reopened by reporter${body.comment ? `: ${body.comment}` : ""}`,
      by: user._id,
      byName: user.fullName,
      at: new Date(),
    });
  }
  await issue.save();
  emitToStaff("issue:updated", { id: String(issue._id), status: issue.status });
  broadcast("issue:changed", { id: String(issue._id), status: issue.status });
  res.json(serialize(issue, user));
}

export async function deleteIssue(req: AuthenticatedRequest, res: Response) {
  const user = req.user!;
  const issue = await loadIssue(req.params.id);
  const isOwner = String(issue.reporterUser) === String(user._id);
  if (user.role !== "admin" && !(isOwner && issue.status === "pending")) {
    throw new HttpError(403, "You can only delete your own reports while they are still pending");
  }
  await deleteStoredFiles(issue.attachments);
  await issue.deleteOne();
  broadcast("issue:deleted", { id: String(issue._id) });
  res.json({ success: true });
}

// ---------- official workflow ----------

const STATUS_MESSAGES: Record<IssueStatus, string> = {
  pending: "is awaiting verification",
  verified: "has been verified and routed to the responsible department",
  "in-progress": "is now being worked on",
  resolved: "has been resolved. Please confirm whether it is fixed",
  closed: "has been closed",
  rejected: "was rejected",
};

const updateIssueBody = z
  .object({
    title: z.string().trim().min(3).max(140).optional(),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(ISSUE_STATUSES).optional(),
    urgency: z.enum(URGENCIES).optional(),
    category: z.enum(CATEGORIES).optional(),
    ward: z.string().trim().max(120).optional(),
    assignedDepartment: z.string().nullable().optional(),
    assignedTo: z.string().nullable().optional(),
    note: z.string().trim().max(1000).optional(),
    rejectionReason: z.string().trim().max(500).optional(),
    resolutionNote: z.string().trim().max(1000).optional(),
  })
  .strict();

export async function updateIssue(req: AuthenticatedRequest, res: Response) {
  const actor = req.user!;
  const body = updateIssueBody.parse(req.body);
  const issue = await loadIssue(req.params.id);

  if (actor.role === "staff") {
    if (!actor.department || String(issue.assignedDepartment) !== String(actor.department)) {
      throw new HttpError(403, "This issue is not assigned to your department");
    }
    if (body.assignedDepartment !== undefined) throw new HttpError(403, "Only admins can reassign departments");
  }

  const prevStatus = issue.status;
  const prevDept = issue.assignedDepartment ? String(issue.assignedDepartment) : null;
  const prevAssignee = issue.assignedTo ? String(issue.assignedTo) : null;

  for (const key of ["title", "description", "urgency", "ward", "rejectionReason", "resolutionNote"] as const) {
    if (body[key] !== undefined) (issue as any)[key] = body[key];
  }
  if (body.category && body.category !== issue.category) {
    issue.category = body.category;
    // Re-route unless the admin is explicitly choosing a department in this same request.
    if (body.assignedDepartment === undefined) issue.assignedDepartment = await departmentForCategory(body.category);
  }

  if (body.assignedDepartment !== undefined) {
    if (body.assignedDepartment && !(await Department.exists({ _id: body.assignedDepartment }))) {
      throw new HttpError(400, "Department not found");
    }
    issue.assignedDepartment = body.assignedDepartment ? new Types.ObjectId(body.assignedDepartment) : null;
  }
  if (body.assignedTo !== undefined) {
    if (body.assignedTo) {
      const worker = await User.findOne({ _id: body.assignedTo, role: { $in: ["staff", "admin"] } });
      if (!worker) throw new HttpError(400, "Assignee must be a staff member");
      issue.assignedTo = worker._id;
      if (!issue.assignedDepartment && worker.department) issue.assignedDepartment = worker.department;
    } else {
      issue.assignedTo = null;
    }
  }

  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length) issue.attachments.push(...(await storeFiles(files)));

  const newStatus = body.status ?? prevStatus;
  if (newStatus !== prevStatus) {
    issue.status = newStatus;
    if (newStatus === "verified" || (!issue.verifiedAt && ["in-progress", "resolved"].includes(newStatus))) {
      issue.verifiedAt = issue.verifiedAt ?? new Date();
      issue.verifiedBy = issue.verifiedBy ?? actor._id;
    }
    if (newStatus === "resolved") issue.resolvedAt = new Date();
    if (OPEN_STATUSES.includes(newStatus)) issue.resolvedAt = undefined;
    if (newStatus === "rejected" && !issue.rejectionReason) throw new HttpError(400, "A rejection reason is required");
  }

  const deptChanged = (issue.assignedDepartment ? String(issue.assignedDepartment) : null) !== prevDept;
  const assigneeChanged = (issue.assignedTo ? String(issue.assignedTo) : null) !== prevAssignee;
  const notes: string[] = [];
  if (deptChanged && issue.assignedDepartment) {
    const d = await Department.findById(issue.assignedDepartment).select("name");
    notes.push(`Assigned to ${d?.name}`);
  }
  if (assigneeChanged && issue.assignedTo) {
    const w = await User.findById(issue.assignedTo).select("fullName");
    notes.push(`Field worker: ${w?.fullName}`);
  }
  if (newStatus === "rejected" && issue.rejectionReason) notes.push(`Reason: ${issue.rejectionReason}`);
  if (newStatus === "resolved" && issue.resolutionNote) notes.push(issue.resolutionNote);
  if (body.note) notes.push(body.note);
  if (newStatus !== prevStatus || notes.length) {
    issue.timeline.push({ status: newStatus, note: notes.join(" · ") || undefined, by: actor._id, byName: actor.fullName, at: new Date() });
  }

  await issue.save();

  // Side effects: rewards + notifications to the reporter.
  if (issue.reporterUser && newStatus !== prevStatus) {
    const firstVerification = !["verified", "in-progress", "resolved", "closed"].includes(prevStatus);
    if (["verified", "in-progress", "resolved"].includes(newStatus) && firstVerification) {
      await awardPoints(issue.reporterUser, POINTS.ISSUE_VERIFIED, "ISSUE_VERIFIED", { issueId: issue._id });
    }
    if (newStatus === "resolved" && prevStatus !== "closed") {
      await awardPoints(issue.reporterUser, POINTS.ISSUE_RESOLVED, "ISSUE_RESOLVED", { issueId: issue._id });
    }
    if (newStatus === "rejected") {
      await awardPoints(issue.reporterUser, POINTS.ISSUE_REJECTED, "ISSUE_REJECTED", { issueId: issue._id });
    }
    const reason = newStatus === "rejected" && issue.rejectionReason ? ` Reason: ${issue.rejectionReason}` : "";
    await notify({
      userId: issue.reporterUser,
      type: newStatus === "resolved" ? "feedback" : "status",
      title: `Report ${newStatus === "in-progress" ? "in progress" : newStatus}`,
      message: `Your report "${issue.title}" ${STATUS_MESSAGES[newStatus]}.${reason}`,
      issueId: issue._id,
      email: true,
    });
  } else if (issue.reporterUser && deptChanged && issue.assignedDepartment) {
    await notify({
      userId: issue.reporterUser,
      type: "assignment",
      title: "Report assigned",
      message: `Your report "${issue.title}" was assigned to a department. ${notes[0] ?? ""}`.trim(),
      issueId: issue._id,
    });
  }
  if (assigneeChanged && issue.assignedTo) {
    await notify({
      userId: issue.assignedTo,
      type: "assignment",
      title: "New task assigned",
      message: `You have been assigned "${issue.title}" at ${issue.location || "the reported location"}.`,
      issueId: issue._id,
      email: true,
    });
  }

  await issue.populate(ISSUE_POPULATE);
  const payload = serialize(issue, actor);
  emitToStaff("issue:updated", payload);
  broadcast("issue:changed", { id: payload.id, status: issue.status });
  res.json(payload);
}

export async function resolveIssueQuick(req: AuthenticatedRequest, res: Response) {
  req.body = { status: "resolved", note: req.body?.note };
  if (!req.body.note) delete req.body.note;
  return updateIssue(req, res);
}
