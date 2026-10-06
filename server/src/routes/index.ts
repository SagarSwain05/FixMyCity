import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware, optionalAuth, requireRoles } from "../middleware/auth";
import { upload } from "../utils/storage";
import * as auth from "../controllers/auth.controller";
import * as profile from "../controllers/profile.controller";
import * as issues from "../controllers/issues.controller";
import * as rewards from "../controllers/rewards.controller";
import * as notifications from "../controllers/notifications.controller";
import * as chatCtl from "../controllers/chat.controller";
import * as admin from "../controllers/admin.controller";
import { CATEGORIES, CATEGORY_LABELS, ISSUE_STATUSES, URGENCIES } from "../constants";
import { Department } from "../models/Department";
import { env } from "../config/env";

const limiter = (windowMin: number, max: number) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    limit: env.isTest ? 10_000 : max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please try again later." },
  });

const router = Router();
const staffOnly = [authMiddleware, requireRoles("admin", "staff")];
const adminOnly = [authMiddleware, requireRoles("admin")];

// --- auth ---
router.post("/auth/signup", limiter(15, 20), auth.signup);
router.post("/auth/login", limiter(15, 30), auth.login);
router.get("/auth/me", authMiddleware, auth.me);

// --- profile ---
router.get("/profile", authMiddleware, profile.getProfile);
router.put("/profile", authMiddleware, profile.updateProfile);
router.post("/profile/avatar", authMiddleware, upload.single("avatar"), profile.uploadAvatar);
router.post("/profile/password", authMiddleware, profile.changePassword);

// --- meta ---
router.get("/meta", async (_req, res) => {
  const departments = await Department.find({ isActive: true }).select("name code color categories").sort({ name: 1 });
  res.json({
    categories: CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] })),
    statuses: ISSUE_STATUSES,
    urgencies: URGENCIES,
    departments,
    duplicateRadiusMeters: env.duplicateRadiusMeters,
  });
});

// --- issues ---
router.get("/issues", optionalAuth, issues.listIssues);
router.get("/issues/map", optionalAuth, issues.mapIssues);
router.get("/issues/nearby", optionalAuth, issues.nearbyIssues);
router.get("/issues/verify-queue", authMiddleware, issues.verifyQueue);
router.get("/issues/meta/stats", issues.issueStats);
router.get("/issues/:id", optionalAuth, issues.getIssue);
router.post("/issues", limiter(10, 30), authMiddleware, upload.array("files", 5), issues.createIssue);
router.post("/issues/:id/upvote", authMiddleware, issues.toggleUpvote);
router.post("/issues/:id/verify", authMiddleware, issues.communityVerify);
router.post("/issues/:id/feedback", authMiddleware, issues.submitFeedback);
router.patch("/issues/:id", ...staffOnly, upload.array("files", 5), issues.updateIssue);
router.post("/issues/:id/resolve", ...staffOnly, issues.resolveIssueQuick);
router.delete("/issues/:id", authMiddleware, issues.deleteIssue);

// --- rewards ---
router.get("/rewards/leaderboard", rewards.leaderboard);
router.get("/rewards/me", authMiddleware, rewards.getMyRewards);
router.get("/rewards/me/transactions", authMiddleware, rewards.getMyRewardTransactions);

// --- notifications ---
router.get("/notifications", authMiddleware, notifications.listNotifications);
router.post("/notifications/read-all", authMiddleware, notifications.markAllRead);
router.patch("/notifications/:id/read", authMiddleware, notifications.markRead);
router.delete("/notifications/:id", authMiddleware, notifications.deleteNotification);

// --- assistant ---
router.post("/chat", limiter(1, 30), optionalAuth, chatCtl.chat);

// --- admin / command center ---
router.get("/admin/analytics", ...staffOnly, admin.analytics);
router.get("/admin/departments", ...staffOnly, admin.listDepartments);
router.post("/admin/departments", ...adminOnly, admin.createDepartment);
router.patch("/admin/departments/:id", ...adminOnly, admin.updateDepartment);
router.delete("/admin/departments/:id", ...adminOnly, admin.deleteDepartment);
router.get("/admin/users", ...staffOnly, admin.listUsers);
router.post("/admin/users", ...adminOnly, admin.createStaff);
router.patch("/admin/users/:id", ...adminOnly, admin.updateUser);

export default router;
