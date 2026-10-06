import { Request, Response } from "express";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { connectDB, getDbStatus } from "../utils/db";
import { storageProvider } from "../utils/storage";
import { isEmailEnabled } from "../services/email.service";
import { connectedClients } from "../services/realtime";
import { bootstrapData } from "../services/bootstrap.service";
import { Issue } from "../models/Issue";
import User from "../models/User";
import { Department } from "../models/Department";
import { CATEGORY_LABELS, OPEN_STATUSES } from "../constants";

const startedAt = Date.now();

type Check = { status: "ok" | "degraded" | "down" | "disabled"; detail?: string; latencyMs?: number };

// External checks are cached so a busy status page can't hammer Cloudinary/Brevo.
const cache = new Map<string, { at: number; value: Check }>();
async function cached(key: string, ttlMs: number, fn: () => Promise<Check>): Promise<Check> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function timed(fn: () => Promise<unknown>, timeoutMs = 5000) {
  const t = Date.now();
  await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs))]);
  return Date.now() - t;
}

async function checkDatabase(): Promise<Check> {
  if (!getDbStatus().connected || !mongoose.connection.db) return { status: "down", detail: "Not connected" };
  try {
    return { status: "ok", latencyMs: await timed(() => mongoose.connection.db!.admin().ping()) };
  } catch (e) {
    return { status: "degraded", detail: (e as Error).message };
  }
}

function checkStorage(): Promise<Check> {
  if (storageProvider() !== "cloudinary") {
    return Promise.resolve({ status: "degraded", detail: "Local disk (files are lost on redeploy)" });
  }
  return cached("storage", 5 * 60_000, async () => {
    try {
      return { status: "ok", detail: "Cloudinary", latencyMs: await timed(() => cloudinary.api.ping()) };
    } catch (e) {
      return { status: "down", detail: `Cloudinary: ${(e as Error).message}` };
    }
  });
}

function checkEmail(): Promise<Check> {
  if (!isEmailEnabled()) return Promise.resolve({ status: "disabled", detail: "BREVO_API_KEY not set" });
  return cached("email", 10 * 60_000, async () => {
    try {
      const t = Date.now();
      const res = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": env.brevo.apiKey, accept: "application/json" } });
      if (!res.ok) return { status: "down", detail: `Brevo responded ${res.status}` };
      return { status: "ok", detail: "Brevo", latencyMs: Date.now() - t };
    } catch (e) {
      return { status: "down", detail: (e as Error).message };
    }
  });
}

// GET /api/system/status: detailed, public (no secrets), works even when the DB is down.
export async function systemStatus(_req: Request, res: Response) {
  const [database, storage, email] = await Promise.all([checkDatabase(), checkStorage(), checkEmail()]);
  const mem = process.memoryUsage();
  const overall = database.status !== "ok" ? "down" : storage.status === "down" || email.status === "down" ? "degraded" : "ok";
  res.json({
    status: overall,
    checkedAt: new Date().toISOString(),
    api: {
      status: "ok",
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      version: (process.env.RENDER_GIT_COMMIT || "dev").slice(0, 7),
      node: process.version,
      memoryMb: Math.round(mem.rss / 1024 / 1024),
      environment: env.isProd ? "production" : "development",
    },
    database,
    storage,
    email,
    realtime: { status: "ok", detail: `${connectedClients()} connected client(s)` } as Check,
  });
}

let reconnecting = false;

// POST /api/system/reconnect: retries the MongoDB connection if it dropped.
export async function reconnectDatabase(_req: Request, res: Response) {
  if (getDbStatus().connected) return res.json({ success: true, message: "Database already connected" });
  if (reconnecting) return res.status(409).json({ success: false, message: "Reconnect already in progress" });
  reconnecting = true;
  try {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => undefined);
    await connectDB();
    await bootstrapData();
    res.json({ success: true, message: "Database reconnected" });
  } catch (e) {
    res.status(503).json({ success: false, message: `Reconnect failed: ${(e as Error).message}` });
  } finally {
    reconnecting = false;
  }
}

let statsCache: { at: number; body: unknown } | null = null;

// GET /api/public/stats: headline numbers for the landing page (cached 60 s).
export async function publicStats(_req: Request, res: Response) {
  if (statsCache && Date.now() - statsCache.at < 60_000) return res.json(statsCache.body);
  const [totals, citizens, departments, wards, recent, byCategory] = await Promise.all([
    Issue.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
          open: { $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] } },
          communityVerified: { $sum: { $cond: ["$communityVerified", 1, 0] } },
          avgHours: {
            $avg: { $cond: [{ $ifNull: ["$resolvedAt", false] }, { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] }, null] },
          },
        },
      },
    ]),
    User.countDocuments({ role: "citizen", isActive: true }),
    Department.countDocuments({ isActive: true }),
    Issue.distinct("ward", { ward: { $nin: [null, ""] } }),
    Issue.find({ status: { $in: ["resolved", "closed"] }, resolvedAt: { $exists: true } })
      .sort({ resolvedAt: -1 })
      .limit(6)
      .select("title category ward resolvedAt createdAt assignedDepartment")
      .populate({ path: "assignedDepartment", select: "name code color" })
      .lean(),
    Issue.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
  ]);
  const t = totals[0] || { total: 0, resolved: 0, open: 0, communityVerified: 0, avgHours: null };
  const body = {
    totals: {
      reports: t.total,
      resolved: t.resolved,
      open: t.open,
      communityVerified: t.communityVerified,
      resolutionRate: t.total ? Math.round((t.resolved / t.total) * 100) : 0,
      avgResolutionHours: t.avgHours ? Math.round(t.avgHours) : null,
      citizens,
      departments,
      wards: wards.length,
    },
    recentResolved: recent.map((i) => ({
      id: String(i._id),
      title: i.title,
      category: i.category,
      categoryLabel: CATEGORY_LABELS[i.category],
      ward: i.ward,
      department: i.assignedDepartment,
      resolvedAt: i.resolvedAt,
      hoursToResolve: i.resolvedAt ? Math.round((new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / 3600000) : null,
    })),
    byCategory: byCategory.map((c) => ({ category: c._id, label: CATEGORY_LABELS[c._id as keyof typeof CATEGORY_LABELS] ?? c._id, count: c.count })),
    generatedAt: new Date().toISOString(),
  };
  statsCache = { at: Date.now(), body };
  res.json(body);
}
