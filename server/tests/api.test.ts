import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fmc-uploads-"));
process.env.CLOUDINARY_URL = "";
process.env.ADMIN_PHONE = "+919000000000";
process.env.ADMIN_PASSWORD = "Admin@1234";

import app from "../src/app";
import { connectDB } from "../src/utils/db";
import { bootstrapData } from "../src/services/bootstrap.service";
import User from "../src/models/User";
import { Department } from "../src/models/Department";

let mongod: MongoMemoryServer;
const api = () => request(app);
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);
const BASE = { lat: 20.2961, lng: 85.8245 };

async function signup(n: number) {
  const res = await api()
    .post("/api/auth/signup")
    .send({
      fullName: `Citizen ${n}`,
      phone: `98765432${String(n).padStart(2, "0")}`,
      email: `c${n}@test.in`,
      password: "secret123",
      address: { city: "Bhubaneswar" },
    });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.data.accessToken as string;
}

const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

let A: string, B: string, C: string, D: string, admin: string, staffRoads: string, staffWater: string;
let issueId: string;

before(async () => {
  mongod = await MongoMemoryServer.create({
    binary: fs.existsSync("/opt/homebrew/bin/mongod") ? { systemBinary: "/opt/homebrew/bin/mongod" } : undefined,
  });
  await connectDB(mongod.getUri(), "fmc-test");
  await bootstrapData();
  [A, B, C, D] = await Promise.all([1, 2, 3, 4].map(signup));

  const res = await api().post("/api/auth/login").send({ identifier: "9000000000", password: "Admin@1234" });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  admin = res.body.data.accessToken;

  const roads = await Department.findOne({ code: "PWD" });
  const water = await Department.findOne({ code: "WSS" });
  for (const [phone, dept] of [["9111111111", roads], ["9222222222", water]] as const) {
    const r = await api()
      .post("/api/admin/users")
      .set(auth(admin))
      .send({ fullName: `Staff ${phone}`, phone, email: `${phone}@city.in`, password: "staff123", department: String(dept!._id) });
    assert.equal(r.status, 201, JSON.stringify(r.body));
  }
  staffRoads = (await api().post("/api/auth/login").send({ identifier: "9111111111@city.in", password: "staff123" })).body.data.accessToken;
  staffWater = (await api().post("/api/auth/login").send({ identifier: "9222222222", password: "staff123" })).body.data.accessToken;
});

after(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

test("health reports db and storage", async () => {
  const res = await api().get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.db.connected, true);
  assert.equal(res.body.storage, "local");
});

test("signup rejects duplicates and validates input", async () => {
  const dup = await api().post("/api/auth/signup").send({
    fullName: "Dup", phone: "9876543201", email: "other@test.in", password: "secret123", address: { city: "X" },
  });
  assert.equal(dup.status, 409);
  const bad = await api().post("/api/auth/signup").send({ fullName: "X", phone: "123", email: "nope", password: "1", address: {} });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.length >= 3);
});

test("citizen creates an issue: auto-categorised, routed, media stored, points awarded", async () => {
  const res = await api()
    .post("/api/issues")
    .set(auth(A))
    .field("title", "Huge pothole near the bus stop")
    .field("description", "Bikes are falling")
    .field("urgency", "medium")
    .field("ward", "Saheed Nagar")
    .field("coordinates", JSON.stringify(BASE))
    .attach("files", PNG, { filename: "p.png", contentType: "image/png" });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.category, "roads");
  assert.equal(res.body.assignedDepartment.code, "PWD");
  assert.equal(res.body.attachments.length, 1);
  assert.match(res.body.attachments[0].url, /\/uploads\//);
  assert.equal(res.body.possibleDuplicateOf, null);
  issueId = res.body.id;

  const file = path.join(process.env.UPLOAD_DIR!, path.basename(res.body.attachments[0].url));
  assert.ok(fs.existsSync(file));

  const me = await api().get("/api/rewards/me").set(auth(A));
  assert.equal(me.body.points, 5);
});

test("anonymous users cannot create issues", async () => {
  const res = await api().post("/api/issues").field("title", "test issue");
  assert.equal(res.status, 401);
});

test("dedup: a report within 50 m of an open same-category issue is flagged", async () => {
  const near = await api().get(`/api/issues/nearby?lat=${BASE.lat + 0.0002}&lng=${BASE.lng}&category=roads`);
  assert.equal(near.status, 200);
  assert.equal(near.body.items.length, 1);

  const res = await api()
    .post("/api/issues")
    .set(auth(B))
    .send({ title: "Pothole again", category: "roads", coordinates: { lat: BASE.lat + 0.0002, lng: BASE.lng } });
  assert.equal(res.status, 201);
  assert.equal(String(res.body.possibleDuplicateOf), issueId);

  const far = await api().get(`/api/issues/nearby?lat=${BASE.lat + 0.01}&lng=${BASE.lng}&category=roads`);
  assert.equal(far.body.items.length, 0);
});

test("upvote toggles", async () => {
  const r1 = await api().post(`/api/issues/${issueId}/upvote`).set(auth(B));
  assert.deepEqual([r1.body.upvoted, r1.body.upvoteCount], [true, 1]);
  const r2 = await api().post(`/api/issues/${issueId}/upvote`).set(auth(B));
  assert.deepEqual([r2.body.upvoted, r2.body.upvoteCount], [false, 0]);
});

test("crowd verification: neighbours confirm, reporter cannot, threshold marks verified and escalates", async () => {
  const queue = await api().get(`/api/issues/verify-queue?lat=${BASE.lat}&lng=${BASE.lng}`).set(auth(C));
  assert.ok(queue.body.some((i: any) => i.id === issueId));

  const own = await api().post(`/api/issues/${issueId}/verify`).set(auth(A)).send({ verdict: "confirm" });
  assert.equal(own.status, 400);

  for (const t of [B, C, D]) {
    const r = await api().post(`/api/issues/${issueId}/verify`).set(auth(t)).send({ verdict: "confirm", severity: "high" });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  const again = await api().post(`/api/issues/${issueId}/verify`).set(auth(B)).send({ verdict: "confirm" });
  assert.equal(again.status, 409);

  const issue = await api().get(`/api/issues/${issueId}`);
  assert.equal(issue.body.communityVerified, true);
  assert.equal(issue.body.communityConfirmations, 3);
  assert.equal(issue.body.urgency, "high");
  assert.equal(issue.body.reporter.email, undefined, "public view must hide reporter contact");
});

test("RBAC: citizens cannot change status, staff limited to own department", async () => {
  const citizen = await api().patch(`/api/issues/${issueId}`).set(auth(B)).send({ status: "resolved" });
  assert.equal(citizen.status, 403);
  const otherDept = await api().patch(`/api/issues/${issueId}`).set(auth(staffWater)).send({ status: "in-progress" });
  assert.equal(otherDept.status, 403);
  const analytics = await api().get("/api/admin/analytics").set(auth(A));
  assert.equal(analytics.status, 403);
});

test("official workflow: verify → in-progress → resolved, with notifications and points", async () => {
  const v = await api().patch(`/api/issues/${issueId}`).set(auth(admin)).send({ status: "verified", note: "Checked photo" });
  assert.equal(v.status, 200, JSON.stringify(v.body));
  assert.ok(v.body.verifiedAt);

  const staffUser = await User.findOne({ phone: "+919111111111" });
  const p = await api()
    .patch(`/api/issues/${issueId}`)
    .set(auth(staffRoads))
    .send({ status: "in-progress", assignedTo: String(staffUser!._id) });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal(p.body.assignedTo.fullName, "Staff 9111111111");

  const r = await api().post(`/api/issues/${issueId}/resolve`).set(auth(staffRoads)).send({ note: "Patched with asphalt" });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, "resolved");
  assert.ok(r.body.resolvedAt);

  const rewards = await api().get("/api/rewards/me").set(auth(A));
  assert.equal(rewards.body.points, 5 + 10 + 5);

  const n = await api().get("/api/notifications").set(auth(A));
  const titles = n.body.items.map((x: any) => x.title);
  assert.ok(titles.includes("Report verified"));
  assert.ok(titles.includes("Report resolved"));
  assert.ok(n.body.unread > 0);
  await api().post("/api/notifications/read-all").set(auth(A));
  assert.equal((await api().get("/api/notifications").set(auth(A))).body.unread, 0);
});

test("reporter feedback closes or reopens", async () => {
  const notOwner = await api().post(`/api/issues/${issueId}/feedback`).set(auth(B)).send({ satisfied: true });
  assert.equal(notOwner.status, 403);
  const res = await api().post(`/api/issues/${issueId}/feedback`).set(auth(A)).send({ satisfied: true, rating: 5 });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "closed");
});

test("rejection needs a reason and deducts points", async () => {
  const created = await api().post("/api/issues").set(auth(C)).send({ title: "Spam spam spam", category: "other" });
  const noReason = await api().patch(`/api/issues/${created.body.id}`).set(auth(admin)).send({ status: "rejected" });
  assert.equal(noReason.status, 400);
  const ok = await api()
    .patch(`/api/issues/${created.body.id}`)
    .set(auth(admin))
    .send({ status: "rejected", rejectionReason: "Not a civic issue" });
  assert.equal(ok.status, 200);
  const list = await api().get("/api/issues");
  assert.ok(!list.body.items.some((i: any) => i.id === created.body.id), "rejected issues are hidden from the public feed");
});

test("listing filters, map endpoint and analytics", async () => {
  const mine = await api().get("/api/issues?mine=true").set(auth(A));
  assert.equal(mine.body.total, 1);
  const roads = await api().get("/api/issues?category=roads");
  assert.ok(roads.body.items.every((i: any) => i.category === "roads"));
  const nearby = await api().get(`/api/issues?lat=${BASE.lat}&lng=${BASE.lng}&radius=500`);
  assert.ok(nearby.body.total >= 2);

  const map = await api().get("/api/issues/map");
  assert.ok(map.body.length >= 2);
  assert.ok(map.body[0].coordinates.lat);

  // hotspots cluster open issues only; add a second open one in the same grid cell
  await api().post("/api/issues").set(auth(D)).send({ title: "Garbage pile", category: "sanitation", coordinates: { lat: BASE.lat + 0.0001, lng: BASE.lng } });
  const a = await api().get("/api/admin/analytics?days=7").set(auth(admin));
  assert.equal(a.status, 200);
  assert.ok(a.body.totals.total >= 3);
  assert.equal(a.body.trend.length, 7);
  assert.ok(a.body.byDepartment.find((d: any) => d.code === "PWD"));
  assert.ok(a.body.byWard.find((w: any) => w.ward === "Saheed Nagar"));
  assert.ok(a.body.hotspots.length >= 1);

  const staffA = await api().get("/api/admin/analytics").set(auth(staffWater));
  assert.equal(staffA.body.totals.total, 0, "staff analytics are scoped to their department");
});

test("departments and leaderboard", async () => {
  const d = await api().get("/api/admin/departments").set(auth(admin));
  assert.equal(d.body.length, 6);
  assert.ok(d.body.find((x: any) => x.code === "PWD").staffCount === 1);
  const lb = await api().get("/api/rewards/leaderboard");
  assert.equal(lb.body[0].name, "Citizen 1");
  assert.ok(!lb.body.some((x: any) => x.name === "System Administrator"));
});

test("chat assistant answers intents and looks up the user's reports", async () => {
  const s = await api().post("/api/chat").set(auth(A)).send({ message: "what is the status of my reports?" });
  assert.match(s.body.reply, /Huge pothole/);
  const cat = await api().post("/api/chat").send({ message: "garbage has not been picked up" });
  assert.equal(cat.body.action.to, "/report?category=sanitation");
});

test("delete permissions", async () => {
  const created = await api().post("/api/issues").set(auth(D)).send({ title: "Leaking tap", category: "water" });
  const other = await api().delete(`/api/issues/${created.body.id}`).set(auth(A));
  assert.equal(other.status, 403);
  const own = await api().delete(`/api/issues/${created.body.id}`).set(auth(D));
  assert.equal(own.status, 200);
});
