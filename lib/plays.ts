import { put, list, del } from "@vercel/blob";

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
    const res = await fetch(match.url, { cache: "no-store" });
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
  try {
    const { blobs } = await list({ prefix: PLAYS_PATH, limit: 1 });
    const existing = blobs.find((b) => b.pathname === PLAYS_PATH);
    if (existing) await del(existing.url);
  } catch (err) {
    console.error("Failed to remove previous plays blob (continuing anyway):", err);
  }

  await put(PLAYS_PATH, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}
