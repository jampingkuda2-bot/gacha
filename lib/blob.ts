import { cache } from "react";
import { put, list, del } from "@vercel/blob";
import { DEFAULT_CONFIG, GachaConfig, normalizeConfig } from "./types";

const CONFIG_PATH = "data/config.json";

// Wrapped with React's cache() so multiple calls within the same request
// (e.g. metadata + page render) share one actual list()/fetch() call instead
// of repeating it — keeps Vercel Blob's metered "Advanced Operations" usage
// low.
export const getConfig = cache(async (): Promise<GachaConfig> => {
  const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
  const match = blobs.find((b) => b.pathname === CONFIG_PATH);
  if (!match) return DEFAULT_CONFIG;

  const res = await fetch(match.url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Gagal mengambil data tersimpan (status ${res.status}).`);
  }
  const data = (await res.json()) as Partial<GachaConfig>;
  return normalizeConfig(data);
});

export async function getConfigSafe(): Promise<GachaConfig> {
  try {
    return await getConfig();
  } catch (err) {
    console.error("getConfig failed, falling back to default:", err);
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(config: GachaConfig): Promise<void> {
  try {
    const { blobs } = await list({ prefix: CONFIG_PATH, limit: 1 });
    const existing = blobs.find((b) => b.pathname === CONFIG_PATH);
    if (existing) await del(existing.url);
  } catch (err) {
    console.error("Failed to remove previous config blob (continuing anyway):", err);
  }

  await put(CONFIG_PATH, JSON.stringify(config, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}
