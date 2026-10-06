import http from "http";
import app from "./app";
import { env, assertProductionEnv } from "./config/env";
import { connectDBWithRetry } from "./utils/db";
import { bootstrapData } from "./services/bootstrap.service";
import { initRealtime } from "./services/realtime";

async function main() {
  assertProductionEnv();
  const server = http.createServer(app);
  initRealtime(server);
  server.listen(env.port, () => console.log(`FixMyCity API listening on :${env.port}`));

  if (await connectDBWithRetry()) await bootstrapData();
  else console.error("Could not connect to MongoDB. API will answer 503 until restarted.");

  process.on("unhandledRejection", (reason) => console.error("Unhandled Rejection:", reason));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
