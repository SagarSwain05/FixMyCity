import "dotenv/config";

const isProd = process.env.NODE_ENV === "production";

function list(value: string | undefined): string[] {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  isProd,
  isTest: process.env.NODE_ENV === "test",
  port: Number(process.env.PORT) || 4000,

  mongoUri: process.env.MONGODB_URI || "",
  mongoDb: process.env.MONGODB_DB || "fixmycity",

  jwtSecret: process.env.JWT_SECRET || (isProd ? "" : "dev-only-insecure-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Comma-separated list of allowed browser origins. Empty = allow all (dev only).
  corsOrigins: list(process.env.CORS_ORIGINS),

  admin: {
    phone: process.env.ADMIN_PHONE || "+919000000000",
    email: process.env.ADMIN_EMAIL || "admin@fixmycity.in",
    password: process.env.ADMIN_PASSWORD || "Admin@1234",
  },

  uploadDir: process.env.UPLOAD_DIR || "uploads",
  // Public base URL of this API, used to build absolute URLs for locally stored uploads.
  publicUrl: (process.env.PUBLIC_API_URL || "").replace(/\/$/, ""),
  cloudinaryUrl: process.env.CLOUDINARY_URL || "",

  brevo: {
    apiKey: process.env.BREVO_API_KEY || "",
    senderEmail: process.env.BREVO_SENDER_EMAIL || "",
    senderName: process.env.BREVO_SENDER_NAME || "FixMyCity",
  },
  clientUrl: (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, ""),

  // Geo tuning
  duplicateRadiusMeters: Number(process.env.DUPLICATE_RADIUS_METERS) || 50,
  verifyRadiusMeters: Number(process.env.VERIFY_RADIUS_METERS) || 2000,
  communityVerifyThreshold: Number(process.env.COMMUNITY_VERIFY_THRESHOLD) || 3,
};

export function assertProductionEnv() {
  if (!env.isProd) return;
  const missing: string[] = [];
  if (!env.mongoUri) missing.push("MONGODB_URI");
  if (!env.jwtSecret) missing.push("JWT_SECRET");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (!env.cloudinaryUrl) {
    console.warn(
      "[env] CLOUDINARY_URL not set: uploads go to local disk, which is wiped on every Render deploy."
    );
  }
}
