import "./config/env";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import path from "path";
import routes from "./routes";
import { env } from "./config/env";
import { getDbStatus } from "./utils/db";
import { storageProvider } from "./utils/storage";
import { isEmailEnabled } from "./services/email.service";
import { errorHandler, notFound } from "./middleware/error";

const app = express();
app.set("trust proxy", 1); // behind Render's proxy: needed for rate limiting by client IP

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
app.use(
  cors({
    origin: env.corsOrigins.length
      ? (origin, cb) => {
          // allow non-browser clients (no Origin) and configured origins, including *.vercel.app previews if listed as a pattern
          if (!origin) return cb(null, true);
          const ok = env.corsOrigins.some((o) =>
            o.includes("*") ? new RegExp(`^${o.replace(/[.]/g, "\\.").replace(/\*/g, "[^.]+")}$`).test(origin) : o === origin
          );
          cb(null, ok); // disallowed origins get no CORS headers, so the browser blocks them
        }
      : true,
  })
);
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
if (!env.isTest) app.use(morgan(env.isProd ? "combined" : "dev"));

app.use("/uploads", express.static(path.resolve(env.uploadDir), { maxAge: "7d" }));

app.get("/", (_req, res) => res.json({ service: "fixmycity-api", docs: "/api/health" }));
app.get("/api/health", (_req, res) => {
  const db = getDbStatus();
  res.status(db.connected ? 200 : 503).json({
    ok: db.connected,
    db,
    storage: storageProvider(),
    email: isEmailEnabled() ? "brevo" : "disabled",
    service: "fixmycity-api",
    time: new Date().toISOString(),
  });
});

app.use("/api", (req, res, next) => {
  if (!getDbStatus().connected) return res.status(503).json({ success: false, message: "Database unavailable" });
  next();
});
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
