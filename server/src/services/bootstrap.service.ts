import User from "../models/User";
import { Department } from "../models/Department";
import { env } from "../config/env";
import { Category } from "../constants";

export const DEFAULT_DEPARTMENTS: Array<{
  name: string;
  code: string;
  color: string;
  categories: Category[];
  description: string;
}> = [
  { name: "Roads & Infrastructure", code: "PWD", color: "#f97316", categories: ["roads"], description: "Potholes, damaged roads, footpaths and bridges" },
  { name: "Sanitation & Waste Management", code: "SWM", color: "#16a34a", categories: ["sanitation"], description: "Garbage collection, public toilets, street cleaning" },
  { name: "Electrical & Street Lighting", code: "ELEC", color: "#eab308", categories: ["streetlights", "electricity"], description: "Streetlights, exposed wires, power outages" },
  { name: "Water Supply & Sewerage", code: "WSS", color: "#0ea5e9", categories: ["water", "drainage"], description: "Water leakage, supply, drains and sewage" },
  { name: "Traffic & Transport", code: "TRF", color: "#ef4444", categories: ["traffic"], description: "Signals, parking, encroachments" },
  { name: "Parks & Environment", code: "ENV", color: "#22c55e", categories: ["environment", "other"], description: "Trees, parks, pollution and general civic issues" },
];

// Idempotent: creates default departments and the bootstrap admin if missing.
export async function bootstrapData() {
  if ((await Department.countDocuments()) === 0) {
    await Department.insertMany(DEFAULT_DEPARTMENTS);
    console.log(`Created ${DEFAULT_DEPARTMENTS.length} default departments`);
  }
  if (!(await User.exists({ role: "admin" }))) {
    await User.create({
      fullName: "System Administrator",
      phone: env.admin.phone,
      email: env.admin.email,
      password: env.admin.password,
      role: "admin",
      isPhoneVerified: true,
      address: { street: "", city: "Bhubaneswar", state: "Odisha", zip: "" },
    });
    console.log(`Created bootstrap admin (${env.admin.phone} / ${env.admin.email}). Change the password after first login.`);
  }
}
