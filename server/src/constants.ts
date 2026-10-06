export const ROLES = ["citizen", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ISSUE_STATUSES = [
  "pending", // submitted by citizen, awaiting verification
  "verified", // verified by officials (or community) and routed to a department
  "in-progress", // work started by department/worker
  "resolved", // fixed
  "closed", // closed after resolution / citizen confirmation
  "rejected", // spam, duplicate or invalid
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const OPEN_STATUSES: IssueStatus[] = ["pending", "verified", "in-progress"];

export const URGENCIES = ["low", "medium", "high", "critical"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const CATEGORIES = [
  "roads",
  "sanitation",
  "streetlights",
  "electricity",
  "water",
  "drainage",
  "traffic",
  "environment",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  roads: "Roads & Potholes",
  sanitation: "Garbage & Sanitation",
  streetlights: "Streetlights",
  electricity: "Electricity",
  water: "Water Supply",
  drainage: "Drainage & Sewage",
  traffic: "Traffic & Parking",
  environment: "Environment & Parks",
  other: "Other",
};

// Keyword hints used to infer a category when the client does not send one.
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  roads: ["pothole", "road", "footpath", "sidewalk", "pavement", "crack", "speed breaker"],
  sanitation: ["garbage", "waste", "trash", "litter", "dump", "sanitation", "dustbin", "toilet"],
  streetlights: ["streetlight", "street light", "lamp", "lamppost", "dark street"],
  electricity: ["electric", "power", "wire", "transformer", "outage", "pole", "electricity"],
  water: ["water", "leak", "pipeline", "tap", "supply", "contaminated"],
  drainage: ["drain", "sewage", "sewer", "manhole", "waterlogging", "flood", "overflow"],
  traffic: ["traffic", "signal", "parking", "encroachment", "zebra"],
  environment: ["tree", "park", "pollution", "smoke", "noise", "burning", "stray"],
  other: [],
};

// Reputation points. Reports earn most of their value only once validated,
// which discourages spam.
export const POINTS = {
  ISSUE_REPORTED: 5,
  ISSUE_VERIFIED: 10,
  ISSUE_RESOLVED: 5,
  COMMUNITY_VERIFICATION: 2,
  WEEKLY_BONUS: 20,
  ISSUE_REJECTED: -5,
} as const;

// Hours within which an issue of given urgency should be resolved.
export const SLA_HOURS: Record<Urgency, number> = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 336,
};
