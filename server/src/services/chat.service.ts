import { Issue } from "../models/Issue";
import { IUser } from "../models/User";
import { CATEGORY_LABELS, POINTS } from "../constants";
import { inferCategory } from "./routing.service";
import { env } from "../config/env";

export interface ChatReply {
  reply: string;
  suggestions: string[];
  action?: { type: "navigate"; to: string; label: string };
}

const STATUS_TEXT: Record<string, string> = {
  pending: "awaiting verification",
  verified: "verified and routed to the department",
  "in-progress": "being worked on",
  resolved: "resolved",
  closed: "closed",
  rejected: "rejected",
};

const DEFAULT_SUGGESTIONS = ["How do I report an issue?", "Status of my reports", "How do points work?", "What can I report?"];

type Intent = { name: string; patterns: RegExp[] };

const INTENTS: Intent[] = [
  { name: "greet", patterns: [/^(hi|hello|hey|namaste|good (morning|evening|afternoon))\b/] },
  { name: "status", patterns: [/status/, /my (reports?|issues?|complaints?)/, /track/, /update on/, /what happened/] },
  { name: "howReport", patterns: [/how.*(report|submit|file|complain)/, /(report|submit|raise).*(issue|problem|complaint)/, /new (report|complaint)/] },
  { name: "points", patterns: [/point/, /reward/, /leaderboard/, /rank/, /badge/, /achievement/] },
  { name: "categories", patterns: [/what can i report/, /categor/, /types? of (issues?|problems?)/] },
  { name: "photo", patterns: [/photo/, /image/, /video/, /camera/, /picture/] },
  { name: "location", patterns: [/location/, /gps/, /\bmap\b/, /address/, /where/] },
  { name: "verify", patterns: [/verify/, /upvote/, /confirm/, /nearby/, /duplicate/, /same issue/] },
  { name: "time", patterns: [/how long/, /when will/, /\bsla\b/, /time to (fix|resolve)/, /deadline/] },
  { name: "emergency", patterns: [/emergency/, /fire/, /accident/, /injur/, /live wire/, /electrocut/] },
  { name: "thanks", patterns: [/thank/, /thx/, /great/, /awesome/] },
];

function detectIntent(text: string): string | null {
  for (const intent of INTENTS) if (intent.patterns.some((p) => p.test(text))) return intent.name;
  return null;
}

// A rule-based assistant: answers platform questions, looks up the user's own
// reports, and helps phrase a report by suggesting the right category.
export async function chatReply(message: string, user?: IUser | null): Promise<ChatReply> {
  const text = message.toLowerCase().trim();
  const intent = detectIntent(text);
  const name = user?.fullName?.split(" ")[0];

  switch (intent) {
    case "greet":
      return {
        reply: `Hello${name ? ` ${name}` : ""}! I'm the FixMyCity assistant. I can help you report a problem, check your reports, or explain how rewards work.`,
        suggestions: DEFAULT_SUGGESTIONS,
      };
    case "emergency":
      return {
        reply:
          "If anyone is in immediate danger, call 112 (emergency), 101 (fire) or 108 (ambulance) first. After that, you can report the hazard here with urgency set to Critical so the department sees it at the top of the queue.",
        suggestions: ["How do I report an issue?"],
        action: { type: "navigate", to: "/report", label: "Report a critical issue" },
      };
    case "status": {
      if (!user) return { reply: "Please sign in so I can look up your reports.", suggestions: DEFAULT_SUGGESTIONS };
      const issues = await Issue.find({ reporterUser: user._id }).sort({ createdAt: -1 }).limit(3).lean();
      if (!issues.length) {
        return {
          reply: "You haven't reported any issues yet. Spot a pothole or a broken streetlight? Report it in under a minute.",
          suggestions: ["How do I report an issue?"],
          action: { type: "navigate", to: "/report", label: "Report an issue" },
        };
      }
      const lines = issues.map((i) => `• "${i.title}" is ${STATUS_TEXT[i.status] || i.status}`);
      return {
        reply: `Here are your latest reports:\n${lines.join("\n")}\nYou'll get a notification the moment any of them changes.`,
        suggestions: ["How long does resolution take?", "How do points work?"],
        action: { type: "navigate", to: "/my-reports", label: "See all my reports" },
      };
    }
    case "howReport":
      return {
        reply:
          "Reporting takes 4 steps:\n1. Tap the + button.\n2. Take a clear photo or video of the problem.\n3. Tap 'Use my location' so we can pin it on the map.\n4. Pick a category, add a short description and urgency, then submit.\nTip: write what is wrong and how it affects people, e.g. \"Deep pothole in the left lane, two-wheelers swerving\".",
        suggestions: ["What can I report?", "Why add a photo?"],
        action: { type: "navigate", to: "/report", label: "Start a report" },
      };
    case "points":
      return {
        reply: `You earn reputation points for civic work:\n• ${POINTS.ISSUE_REPORTED} for each report\n• ${POINTS.ISSUE_VERIFIED} more when officials verify it\n• ${POINTS.ISSUE_RESOLVED} when it gets resolved\n• ${POINTS.COMMUNITY_VERIFICATION} for verifying issues near you\n• ${POINTS.WEEKLY_BONUS} bonus for 5+ reports in a week\nReports rejected as spam lose ${Math.abs(POINTS.ISSUE_REJECTED)} points.${user ? ` You currently have ${user.points} points.` : ""}`,
        suggestions: ["Status of my reports", "How do I verify nearby issues?"],
        action: { type: "navigate", to: "/rewards", label: "Open leaderboard" },
      };
    case "categories":
      return {
        reply: `You can report: ${Object.values(CATEGORY_LABELS).join(", ")}. Not sure which one fits? Describe the problem to me and I'll suggest a category.`,
        suggestions: ["How do I report an issue?"],
      };
    case "photo":
      return {
        reply:
          "A photo or short video is the strongest proof and gets your report verified faster. Capture the problem in daylight, include a landmark if you can, and keep it under 15 MB. You can attach up to 5 files.",
        suggestions: ["How do I report an issue?"],
      };
    case "location":
      return {
        reply:
          "Tap 'Use my location' on the report form to pin your exact GPS position. Allow location access in your browser when asked. You can also drag the pin on the map if you're reporting from somewhere else.",
        suggestions: ["How do I report an issue?"],
      };
    case "verify":
      return {
        reply: `If someone already reported the same problem within ${env.duplicateRadiusMeters} m, we'll show it to you so you can upvote it instead of filing a duplicate. You can also confirm or dispute new reports near you from the home screen. Each check earns ${POINTS.COMMUNITY_VERIFICATION} points, and ${env.communityVerifyThreshold} confirmations mark a report as community-verified.`,
        suggestions: ["How do points work?"],
        action: { type: "navigate", to: "/", label: "Verify nearby issues" },
      };
    case "time":
      return {
        reply:
          "Target resolution times: Critical within 24 h, High within 3 days, Medium within 7 days, Low within 14 days. Officials first verify the report, then assign it to a department.",
        suggestions: ["Status of my reports"],
      };
    case "thanks":
      return { reply: "Happy to help! Every report makes the city a little better.", suggestions: DEFAULT_SUGGESTIONS };
  }

  // Fall back: treat the message as a problem description and suggest a category.
  const category = inferCategory(text);
  if (category !== "other" && text.split(/\s+/).length >= 2) {
    return {
      reply: `That sounds like a "${CATEGORY_LABELS[category]}" issue. Open the report form, choose that category and attach a photo so the right department picks it up.`,
      suggestions: ["How do I report an issue?", "What can I report?"],
      action: { type: "navigate", to: `/report?category=${category}`, label: `Report ${CATEGORY_LABELS[category]}` },
    };
  }

  return {
    reply: "I'm not sure I understood. Try one of these, or describe the problem you see (for example \"garbage not collected for 3 days\").",
    suggestions: DEFAULT_SUGGESTIONS,
  };
}
