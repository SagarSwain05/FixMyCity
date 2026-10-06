/**
 * Demo data for FixMyCity (Bhubaneswar).
 *
 *   npm run seed            # adds demo data if the database has no issues yet
 *   npm run seed -- --reset # wipes issues, notifications, rewards and demo users first
 *
 * In production (NODE_ENV=production) --force is also required.
 */
import mongoose from "mongoose";
import { env } from "../config/env";
import { connectDB } from "../utils/db";
import { bootstrapData } from "../services/bootstrap.service";
import User from "../models/User";
import { Department } from "../models/Department";
import { Issue } from "../models/Issue";
import { Notification } from "../models/Notification";
import { RewardTransaction } from "../models/RewardTransaction";
import { Category, IssueStatus, Urgency } from "../constants";

const args = new Set(process.argv.slice(2));
const DEMO_PASSWORD = "Demo@1234";
const ISSUE_COUNT = 30;

const WARDS: Array<{ name: string; lat: number; lng: number }> = [
  { name: "Saheed Nagar", lat: 20.29, lng: 85.844 },
  { name: "Patia", lat: 20.354, lng: 85.819 },
  { name: "Nayapalli", lat: 20.295, lng: 85.805 },
  { name: "Old Town", lat: 20.238, lng: 85.835 },
  { name: "Jaydev Vihar", lat: 20.298, lng: 85.818 },
  { name: "Chandrasekharpur", lat: 20.325, lng: 85.816 },
  { name: "Khandagiri", lat: 20.256, lng: 85.78 },
  { name: "Rasulgarh", lat: 20.29, lng: 85.86 },
  { name: "Unit 4", lat: 20.278, lng: 85.831 },
  { name: "Baramunda", lat: 20.277, lng: 85.801 },
];

const TEMPLATES: Array<{ title: string; description: string; category: Category }> = [
  { title: "Deep pothole on main road", description: "Large pothole in the left lane, two-wheelers are swerving into traffic.", category: "roads" },
  { title: "Broken footpath slabs", description: "Footpath slabs are broken and lifted, pedestrians are tripping.", category: "roads" },
  { title: "Garbage not collected for 3 days", description: "Overflowing bins near the market, strong smell and stray animals.", category: "sanitation" },
  { title: "Illegal garbage dumping", description: "Construction debris and household waste dumped on the roadside.", category: "sanitation" },
  { title: "Streetlight not working", description: "Three consecutive streetlights are off, the lane is completely dark at night.", category: "streetlights" },
  { title: "Streetlight on during the day", description: "Streetlights stay on through the day, wasting power.", category: "streetlights" },
  { title: "Exposed electric wires", description: "Wires hanging low from the pole near the school gate.", category: "electricity" },
  { title: "Water pipeline leakage", description: "Clean water is leaking from the main pipeline and flooding the road.", category: "water" },
  { title: "No water supply since morning", description: "Entire block has had no municipal water supply since 6 AM.", category: "water" },
  { title: "Open manhole", description: "Manhole cover missing on a busy road, very dangerous at night.", category: "drainage" },
  { title: "Drain overflowing", description: "Blocked drain overflowing onto the street after rain.", category: "drainage" },
  { title: "Traffic signal not working", description: "Signal at the junction is blinking yellow, causing jams at peak hours.", category: "traffic" },
  { title: "Vehicles parked on footpath", description: "Cars parked on the footpath force pedestrians onto the road.", category: "traffic" },
  { title: "Fallen tree blocking lane", description: "A tree fell after the storm and is blocking half the lane.", category: "environment" },
  { title: "Garbage burning in open plot", description: "Waste is burnt every evening, smoke is entering homes.", category: "environment" },
];

const CITIZENS = [
  { fullName: "Priya Mohanty", phone: "+919777000001", email: "priya@demo.fixmycity.in" },
  { fullName: "Rohan Behera", phone: "+919777000002", email: "rohan@demo.fixmycity.in" },
  { fullName: "Anjali Panda", phone: "+919777000003", email: "anjali@demo.fixmycity.in" },
  { fullName: "Rahul Patnaik", phone: "+919777000004", email: "rahul@demo.fixmycity.in" },
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function jitter(v: number, spread = 0.008) {
  return Math.round((v + (Math.random() - 0.5) * spread) * 1e6) / 1e6;
}

async function main() {
  if (env.isProd && !args.has("--force")) {
    throw new Error("Refusing to seed in production without --force");
  }
  await connectDB();
  await bootstrapData();

  if (args.has("--reset")) {
    await Promise.all([
      Issue.deleteMany({}),
      Notification.deleteMany({}),
      RewardTransaction.deleteMany({}),
      User.deleteMany({ email: /@demo\.fixmycity\.in$/ }),
    ]);
    await User.updateMany({}, { points: 0 });
    console.log("Reset demo data");
  } else if (await Issue.exists({})) {
    console.log("Issues already exist; skipping. Use --reset to start over.");
    return;
  }

  const depts = await Department.find();
  const deptByCat = new Map<Category, (typeof depts)[number]>();
  for (const d of depts) for (const c of d.categories) deptByCat.set(c, d);

  // One staff member per department.
  const staff = [];
  for (const [i, d] of depts.entries()) {
    const s = await User.create({
      fullName: `${d.code} Field Officer`,
      phone: `+91977710${String(i).padStart(4, "0")}`,
      email: `${d.code.toLowerCase()}.officer@demo.fixmycity.in`,
      password: DEMO_PASSWORD,
      role: "staff",
      department: d._id,
      isPhoneVerified: true,
      emailNotifications: false, // demo addresses must never receive real email
      address: { street: "", city: "Bhubaneswar", state: "Odisha", zip: "" },
    });
    staff.push(s);
  }
  const staffByDept = new Map(staff.map((s) => [String(s.department), s]));

  const citizens = [];
  for (const c of CITIZENS) {
    citizens.push(
      await User.create({ ...c, password: DEMO_PASSWORD, emailNotifications: false, address: { street: "", city: "Bhubaneswar", state: "Odisha", zip: "751001" } })
    );
  }
  const admin = await User.findOne({ role: "admin" });

  const statusPool: IssueStatus[] = [
    "pending", "pending", "pending", "verified", "verified", "in-progress", "in-progress",
    "resolved", "resolved", "resolved", "closed", "closed", "rejected",
  ];
  const urgencyPool: Urgency[] = ["low", "medium", "medium", "high", "high", "critical"];
  const points = new Map<string, number>();
  const addPoints = (id: string, n: number) => points.set(id, (points.get(id) || 0) + n);

  const HOUR = 3600 * 1000;
  for (let i = 0; i < ISSUE_COUNT; i++) {
    const t = rand(TEMPLATES);
    const ward = rand(WARDS);
    const reporter = rand(citizens);
    const status = rand(statusPool);
    const urgency = rand(urgencyPool);
    const createdAt = new Date(Date.now() - Math.random() * 45 * 24 * HOUR);
    const dept = deptByCat.get(t.category);
    const worker = dept ? staffByDept.get(String(dept._id)) : undefined;

    const timeline: any[] = [{ status: "pending", note: "Issue reported", by: reporter._id, byName: reporter.fullName, at: createdAt }];
    let cursor = createdAt.getTime();
    const step = () => (cursor += (2 + Math.random() * 40) * HOUR);
    let verifiedAt: Date | undefined;
    let resolvedAt: Date | undefined;

    if (status !== "pending" && status !== "rejected") {
      verifiedAt = new Date(step());
      timeline.push({ status: "verified", note: `Assigned to ${dept?.name}`, by: admin?._id, byName: admin?.fullName, at: verifiedAt });
    }
    if (["in-progress", "resolved", "closed"].includes(status)) {
      timeline.push({ status: "in-progress", note: `Field worker: ${worker?.fullName}`, by: worker?._id, byName: worker?.fullName, at: new Date(step()) });
    }
    if (["resolved", "closed"].includes(status)) {
      resolvedAt = new Date(step());
      timeline.push({ status: "resolved", note: "Work completed on site", by: worker?._id, byName: worker?.fullName, at: resolvedAt });
    }
    if (status === "closed") timeline.push({ status: "closed", note: "Reporter confirmed the fix", by: reporter._id, byName: reporter.fullName, at: new Date(step()) });
    if (status === "rejected") timeline.push({ status: "rejected", note: "Reason: Not a municipal issue", by: admin?._id, byName: admin?.fullName, at: new Date(step()) });

    const voters = citizens.filter((c) => c._id !== reporter._id).sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 5));
    const confirms = voters.length;
    const lat = jitter(ward.lat);
    const lng = jitter(ward.lng);

    const issue = new Issue({
      title: t.title,
      description: t.description,
      category: t.category,
      status,
      urgency,
      location: `${ward.name}, Bhubaneswar, Odisha`,
      ward: ward.name,
      coordinates: { lat, lng },
      reporter: { name: reporter.fullName, email: reporter.email, phone: reporter.phone },
      reporterUser: reporter._id,
      assignedDepartment: dept?._id ?? null,
      assignedTo: ["in-progress", "resolved", "closed"].includes(status) ? worker?._id : null,
      upvotes: voters.map((v) => v._id),
      upvoteCount: voters.length,
      communityVotes: voters.map((v) => ({ user: v._id, verdict: "confirm", severity: urgency, at: new Date(createdAt.getTime() + HOUR) })),
      communityVerified: confirms >= env.communityVerifyThreshold,
      verifiedAt,
      verifiedBy: verifiedAt ? admin?._id : null,
      resolvedAt,
      rejectionReason: status === "rejected" ? "Not a municipal issue" : undefined,
      feedback: status === "closed" ? { satisfied: true, rating: 4 + Math.round(Math.random()), at: new Date(cursor) } : undefined,
      timeline,
    });
    issue.set("createdAt", createdAt);
    issue.set("updatedAt", new Date(cursor));
    await issue.save({ timestamps: false });

    addPoints(String(reporter._id), 5);
    if (verifiedAt) addPoints(String(reporter._id), 10);
    if (resolvedAt) addPoints(String(reporter._id), 5);
    for (const v of voters) addPoints(String(v._id), 2);
  }

  for (const [id, p] of points) await User.updateOne({ _id: id }, { points: p });

  console.log(`Seeded ${staff.length} staff, ${citizens.length} citizens and ${ISSUE_COUNT} issues.`);
  console.log(`Demo citizen login: ${CITIZENS[0].phone} / ${DEMO_PASSWORD}`);
  console.log(`Demo staff login:   ${staff[0].email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
