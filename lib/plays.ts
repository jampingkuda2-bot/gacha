import { put, list } from "@vercel/blob";

const PLAYS_PATH = "data/plays.json";

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
    const { blobs } = await list({ prefix: PLAYS_PATH, limit: 1 });
    const match = blobs.find((b) => b.pathname === PLAYS_PATH);
    if (!match) return EMPTY;
    // Cache-bust: even with cacheControlMaxAge:0 on write, belt-and-braces
    // against any intermediary cache still holding an old snapshot of this
    // stable URL (addRandomSuffix: false means the URL never changes).
    const bustUrl = `${match.url}?t=${Date.now()}`;
    const res = await fetch(bustUrl, { cache: "no-store", headers: { "cache-control": "no-cache" } });
    if (!res.ok) return EMPTY;
    const raw = (await res.json()) as Partial<PlaysData> | null;
    const byDevice = raw && typeof raw.byDevice === "object" && raw.byDevice !== null ? raw.byDevice : {};
    return { byDevice };
  } catch (err) {
    console.error("getPlaysData failed, falling back to empty:", err);
    return EMPTY;
  }
}

export async function savePlaysData(data: PlaysData): Promise<void> {
  // A single atomic overwrite instead of the old list -> del -> put dance.
  // put() with addRandomSuffix: false already overwrites the blob at that
  // pathname directly. The previous version deleted the existing blob
  // first and then wrote a new one; if that delete lagged behind (Vercel
  // Blob's list/delete is eventually consistent), a fast second request
  // could read a stale "not found" list, or the delete could race the
  // write, dropping the increment on the floor.
  //
  // cacheControlMaxAge: 0 is the real fix for "remaining doesn't go down".
  // @vercel/blob defaults to caching a blob at Vercel's edge for up to 5
  // minutes after every write. Play counts change on nearly every request,
  // so that default cache was serving back a stale (pre-increment) copy of
  // plays.json well within a normal play session — the count looked frozen
  // even though the write itself succeeded.
  await put(PLAYS_PATH, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
}
