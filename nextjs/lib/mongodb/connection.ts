import mongoose from "mongoose";
import dns from "dns";

// Fix Windows ISP DNS failing on MongoDB Atlas SRV records
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.warn("Could not set custom DNS servers:", e);
}

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI env variable is not defined");

declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

if (!global._mongooseCache) {
  global._mongooseCache = { conn: null, promise: null };
}

export async function connectMongoDB(): Promise<typeof mongoose> {
  // Return cached connection immediately — avoids cold-start latency on repeat requests
  if (global._mongooseCache.conn) return global._mongooseCache.conn;

  if (!global._mongooseCache.promise) {
    global._mongooseCache.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || "Capflow",
      bufferCommands: false,
      // Connection pool — keeps N connections alive so requests don't wait for a new socket
      maxPoolSize: 10,
      minPoolSize: 2,
      // Faster timeouts so slow DNS/network fails fast and retries
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
    });
  }

  global._mongooseCache.conn = await global._mongooseCache.promise;
  return global._mongooseCache.conn;
}

// Call this at module load time to start the connection early
// (imported by API routes, so connection begins on first import, not first request)
connectMongoDB().catch((err) =>
  console.warn("[MongoDB] Initial connection failed:", err.message)
);
