import type { Category, IssueStatus, Urgency } from "./api";

export function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr${hr > 1 ? "s" : ""} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export const STATUS_LABEL: Record<IssueStatus, string> = {
  pending: "Pending",
  verified: "Verified",
  "in-progress": "In Progress",
  resolved: "Resolved",
  closed: "Closed",
  rejected: "Rejected",
};

export const STATUS_STYLE: Record<IssueStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  verified: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  "in-progress": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  closed: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

// Pin colours on maps, by status.
export const STATUS_COLOR: Record<IssueStatus, string> = {
  pending: "#f59e0b",
  verified: "#0ea5e9",
  "in-progress": "#6366f1",
  resolved: "#16a34a",
  closed: "#6b7280",
  rejected: "#dc2626",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const URGENCY_BORDER: Record<Urgency, string> = {
  low: "border-l-green-500",
  medium: "border-l-amber-500",
  high: "border-l-orange-500",
  critical: "border-l-red-600",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  roads: "🛣️",
  sanitation: "🗑️",
  streetlights: "💡",
  electricity: "⚡",
  water: "🚰",
  drainage: "🕳️",
  traffic: "🚦",
  environment: "🌳",
  other: "📍",
};

export const CATEGORIES: Array<{ value: Category; label: string; hint: string }> = [
  { value: "roads", label: "Roads & Potholes", hint: "Potholes, broken footpaths" },
  { value: "sanitation", label: "Garbage & Sanitation", hint: "Uncollected garbage, dumping" },
  { value: "streetlights", label: "Streetlights", hint: "Lights off, flickering" },
  { value: "electricity", label: "Electricity", hint: "Exposed wires, outages" },
  { value: "water", label: "Water Supply", hint: "Leaks, no supply" },
  { value: "drainage", label: "Drainage & Sewage", hint: "Open manholes, overflow" },
  { value: "traffic", label: "Traffic & Parking", hint: "Signals, illegal parking" },
  { value: "environment", label: "Environment & Parks", hint: "Fallen trees, burning" },
  { value: "other", label: "Other", hint: "Anything else" },
];
