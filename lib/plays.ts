import { Redis } from "@upstash/redis";

// Play counts change on almost every request and need to be read back
// correctly right away — Vercel Blob is object storage with an edge cache
// in front of it (up to 5 minutes, and there's still replication lag even
// with cacheControlMaxAge: 0), so a flip/spin could increment the count but
// the very next request would still read the old number back. That's what
// made "remaining" look stuck or delayed no matter how the Blob read/write
// was tuned.
//
// Redis (via Upstash, the storage Vercel now points people to for this) is
// a real database with immediate read-after-write consistency, which is
// what a live counter actually needs. Requires an "Upstash for Redis"
// integration connected to this project (Vercel dashboard →
// Storage/Marketplace), which auto-fills KV_REST_API_URL / KV_REST_API_TOKEN.
const redis = new Redis({
  url: process.env.KV_REST_API_URL || "",
  token: process.env.KV_REST_API_TOKEN || "",
});

const PLAYS_KEY = "plays:data";

export type PlayRecord = {
  type: "spin" | "flip";
  result: string;
  time: string;
  device: string;
};

export type PlaysData = {
  byDevice: Record<string, { spins: number; flips: number; history: PlayRecord[] }>;
};

const EMPTY: PlaysData = { byDevice: {} };

export async function getPlaysData(): Promise<PlaysData> {
  try {
    const raw = await redis.get<Partial<PlaysData>>(PLAYS_KEY);
    const byDevice = raw && typeof raw.byDevice === "object" && raw.byDevice !== null ? raw.byDevice : {};
    return { byDevice };
  } catch (err) {
    console.error("getPlaysData failed (is Upstash Redis connected?), falling back to empty:", err);
    return EMPTY;
  }
}

export async function savePlaysData(data: PlaysData): Promise<void> {
  await redis.set(PLAYS_KEY, data);
}
