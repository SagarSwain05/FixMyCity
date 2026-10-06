import mongoose from "mongoose";
import { env } from "../config/env";

let connected = false;
export function getDbStatus() {
  return { connected };
}

mongoose.connection.on("connected", () => {
  connected = true;
  console.log("MongoDB connected");
});
mongoose.connection.on("disconnected", () => {
  connected = false;
  console.warn("MongoDB disconnected");
});
mongoose.connection.on("error", (err) => {
  connected = false;
  console.error("MongoDB error", err.message);
});

export async function connectDB(uri = env.mongoUri, dbName = env.mongoDb) {
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri, { dbName });
  await mongoose.connection.syncIndexes();
}

export async function connectDBWithRetry(retries = 10, delayMs = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await connectDB();
      return true;
    } catch (err) {
      console.warn(`MongoDB connect attempt ${attempt}/${retries} failed: ${(err as Error).message}`);
      if (attempt === retries) return false;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return false;
}
