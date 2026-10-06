import { Issue } from "../models/Issue";
import { Department } from "../models/Department";
import { OPEN_STATUSES, SLA_HOURS } from "../constants";

const HOUR_MS = 3600 * 1000;

function toRecord(rows: Array<{ _id: string | null; count: number }>) {
  return Object.fromEntries(rows.map((r) => [r._id ?? "unknown", r.count]));
}

// Mongo expression: true when an open issue is older than the SLA for its urgency.
const slaBreachedExpr = {
  $and: [
    { $in: ["$status", OPEN_STATUSES] },
    {
      $gt: [
        { $subtract: ["$$NOW", "$createdAt"] },
        {
          $multiply: [
            HOUR_MS,
            {
              $switch: {
                branches: Object.entries(SLA_HOURS).map(([urgency, hours]) => ({
                  case: { $eq: ["$urgency", urgency] },
                  then: hours,
                })),
                default: SLA_HOURS.medium,
              },
            },
          ],
        },
      ],
    },
  ],
};

const resolutionHoursExpr = {
  $cond: [
    { $ifNull: ["$resolvedAt", false] },
    { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, HOUR_MS] },
    null,
  ],
};

export async function getAnalytics({ days = 30, departmentId }: { days?: number; departmentId?: string } = {}) {
  const since = new Date(Date.now() - days * 24 * HOUR_MS);
  since.setHours(0, 0, 0, 0);
  const match: Record<string, unknown> = {};
  if (departmentId) {
    const { Types } = await import("mongoose");
    match.assignedDepartment = new Types.ObjectId(departmentId);
  }

  const [facets] = await Issue.aggregate([
    { $match: match },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] } },
              pendingVerification: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
              slaBreaches: { $sum: { $cond: [slaBreachedExpr, 1, 0] } },
              avgResolutionHours: { $avg: resolutionHoursExpr },
              communityVerified: { $sum: { $cond: ["$communityVerified", 1, 0] } },
              flaggedDuplicates: { $sum: { $cond: [{ $ifNull: ["$possibleDuplicateOf", false] }, 1, 0] } },
              satisfied: { $sum: { $cond: [{ $eq: ["$feedback.satisfied", true] }, 1, 0] } },
              feedbackCount: { $sum: { $cond: [{ $ifNull: ["$feedback.at", false] }, 1, 0] } },
            },
          },
        ],
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        byCategory: [{ $group: { _id: "$category", count: { $sum: 1 } } }],
        byUrgency: [{ $group: { _id: "$urgency", count: { $sum: 1 } } }],
        byWard: [
          { $match: { ward: { $nin: [null, ""] } } },
          {
            $group: {
              _id: "$ward",
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
              avgResolutionHours: { $avg: resolutionHoursExpr },
            },
          },
          { $sort: { total: -1 } },
          { $limit: 20 },
        ],
        byDepartment: [
          {
            $group: {
              _id: "$assignedDepartment",
              total: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ["$status", OPEN_STATUSES] }, 1, 0] } },
              resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } },
              slaBreaches: { $sum: { $cond: [slaBreachedExpr, 1, 0] } },
              avgResolutionHours: { $avg: resolutionHoursExpr },
            },
          },
        ],
        createdTrend: [
          { $match: { createdAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        ],
        resolvedTrend: [
          { $match: { resolvedAt: { $gte: since } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$resolvedAt" } }, count: { $sum: 1 } } },
        ],
        // Hotspots: cluster open issues into ~110 m grid cells.
        hotspots: [
          { $match: { status: { $in: OPEN_STATUSES }, "coordinates.lat": { $type: "number" } } },
          {
            $group: {
              _id: {
                lat: { $round: ["$coordinates.lat", 3] },
                lng: { $round: ["$coordinates.lng", 3] },
              },
              count: { $sum: 1 },
              categories: { $addToSet: "$category" },
              sample: { $first: "$location" },
              critical: { $sum: { $cond: [{ $in: ["$urgency", ["high", "critical"]] }, 1, 0] } },
            },
          },
          { $match: { count: { $gte: 2 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ],
        resolutionByCategory: [
          { $match: { resolvedAt: { $exists: true } } },
          { $group: { _id: "$category", avgHours: { $avg: resolutionHoursExpr }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const depts = await Department.find().select("name code color").lean();
  const deptById = new Map(depts.map((d) => [String(d._id), d]));

  const trendMap = (rows: Array<{ _id: string; count: number }>) => new Map(rows.map((r) => [r._id, r.count]));
  const created = trendMap(facets.createdTrend);
  const resolvedT = trendMap(facets.resolvedTrend);
  const trend = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * HOUR_MS);
    const key = d.toISOString().slice(0, 10);
    trend.push({ date: key, reports: created.get(key) || 0, resolved: resolvedT.get(key) || 0 });
  }

  const totals = facets.totals[0] || {
    total: 0, open: 0, pendingVerification: 0, resolved: 0, rejected: 0, slaBreaches: 0,
    avgResolutionHours: null, communityVerified: 0, flaggedDuplicates: 0, satisfied: 0, feedbackCount: 0,
  };
  const round1 = (n: number | null | undefined) => (typeof n === "number" ? Math.round(n * 10) / 10 : null);

  return {
    totals: {
      total: totals.total,
      open: totals.open,
      pendingVerification: totals.pendingVerification,
      resolved: totals.resolved,
      rejected: totals.rejected,
      slaBreaches: totals.slaBreaches,
      communityVerified: totals.communityVerified,
      flaggedDuplicates: totals.flaggedDuplicates,
      avgResolutionHours: round1(totals.avgResolutionHours),
      resolutionRate: totals.total ? Math.round((totals.resolved / totals.total) * 1000) / 10 : 0,
      satisfactionRate: totals.feedbackCount ? Math.round((totals.satisfied / totals.feedbackCount) * 1000) / 10 : null,
    },
    byStatus: toRecord(facets.byStatus),
    byCategory: toRecord(facets.byCategory),
    byUrgency: toRecord(facets.byUrgency),
    byWard: facets.byWard.map((w: any) => ({
      ward: w._id, total: w.total, open: w.open, resolved: w.resolved, avgResolutionHours: round1(w.avgResolutionHours),
    })),
    byDepartment: facets.byDepartment
      .map((d: any) => {
        const dept = d._id ? deptById.get(String(d._id)) : null;
        return {
          departmentId: d._id ? String(d._id) : null,
          name: dept?.name || "Unassigned",
          code: dept?.code || "-",
          color: dept?.color || "#9ca3af",
          total: d.total,
          open: d.open,
          resolved: d.resolved,
          slaBreaches: d.slaBreaches,
          avgResolutionHours: round1(d.avgResolutionHours),
          resolutionRate: d.total ? Math.round((d.resolved / d.total) * 1000) / 10 : 0,
        };
      })
      .sort((a: any, b: any) => b.total - a.total),
    trend,
    hotspots: facets.hotspots.map((h: any) => ({
      lat: h._id.lat, lng: h._id.lng, count: h.count, critical: h.critical, categories: h.categories, sampleLocation: h.sample,
    })),
    resolutionByCategory: Object.fromEntries(
      facets.resolutionByCategory.map((r: any) => [r._id, { avgHours: round1(r.avgHours), count: r.count }])
    ),
    generatedAt: new Date().toISOString(),
  };
}
