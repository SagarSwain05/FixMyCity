import { Types } from "mongoose";
import { CATEGORIES, CATEGORY_KEYWORDS, Category, OPEN_STATUSES } from "../constants";
import { Department } from "../models/Department";
import { Issue } from "../models/Issue";
import { env } from "../config/env";

export function inferCategory(text: string): Category {
  const t = text.toLowerCase();
  let best: Category = "other";
  let bestScore = 0;
  for (const cat of CATEGORIES) {
    const score = CATEGORY_KEYWORDS[cat].reduce((n, kw) => (t.includes(kw) ? n + 1 : n), 0);
    if (score > bestScore) {
      best = cat;
      bestScore = score;
    }
  }
  return best;
}

export async function departmentForCategory(category: Category): Promise<Types.ObjectId | null> {
  const dept = await Department.findOne({ categories: category, isActive: true }).select("_id").lean();
  return dept?._id ?? null;
}

// Deduplication: find open issues of the same category within `radius` metres.
export async function findNearbyOpenIssues(
  lat: number,
  lng: number,
  opts: { category?: Category; radius?: number; excludeId?: Types.ObjectId | string; limit?: number } = {}
) {
  const query: Record<string, unknown> = {
    status: { $in: OPEN_STATUSES },
    geo: {
      $near: {
        $geometry: { type: "Point", coordinates: [lng, lat] },
        $maxDistance: opts.radius ?? env.duplicateRadiusMeters,
      },
    },
  };
  if (opts.category) query.category = opts.category;
  if (opts.excludeId) query._id = { $ne: opts.excludeId };
  return Issue.find(query)
    .limit(opts.limit ?? 5)
    .select("title category status urgency location coordinates upvoteCount createdAt attachments");
}
