import type { Issue } from "./api";

function cell(v: unknown) {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function issuesToCsv(issues: Issue[]) {
  const header = ["ID", "Title", "Category", "Status", "Urgency", "Ward", "Location", "Latitude", "Longitude", "Department", "Assigned to", "Upvotes", "Community confirmations", "Reported", "Verified", "Resolved", "Resolution hours"];
  const rows = issues.map((i) => [
    i.id,
    i.title,
    i.categoryLabel,
    i.status,
    i.urgency,
    i.ward,
    i.location,
    i.coordinates?.lat,
    i.coordinates?.lng,
    i.assignedDepartment?.name,
    i.assignedTo?.fullName,
    i.upvoteCount,
    i.communityConfirmations,
    i.createdAt,
    i.verifiedAt,
    i.resolvedAt,
    i.resolvedAt ? ((new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()) / 36e5).toFixed(1) : "",
  ]);
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

export function download(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["﻿", content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
