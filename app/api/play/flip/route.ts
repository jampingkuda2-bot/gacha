import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/blob";
import { getPlaysData, savePlaysData, PlayRecord } from "@/lib/plays";
import { parseDevice } from "@/lib/device";
import { CARD_COUNT, pickWeightedIndex } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId") || "";
  const fingerprint = searchParams.get("fp") || "";
  const key = deviceId || fingerprint || "unknown";

  let maxFlips = 1;
  try {
    const config = await getConfig();
    maxFlips = config.maxFlipsPerDevice;
  } catch {
    // fall through with default maxFlips if config is unreachable
  }

  const plays = await getPlaysData();
  const used = plays.byDevice[key]?.flips ?? 0;
  return NextResponse.json({
    remaining: Math.max(0, maxFlips - used),
    max: maxFlips,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cardIndex = Number(body.cardIndex);
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const fingerprint = typeof body.fingerprint === "string" ? body.fingerprint : "";

  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= CARD_COUNT) {
    return NextResponse.json({ error: "Kartu tidak valid." }, { status: 400 });
  }

  let config;
  try {
    config = await getConfig();
  } catch (err) {
    console.error("flip: failed to load config:", err);
    return NextResponse.json({ error: "Server lagi bermasalah, coba lagi sebentar." }, { status: 500 });
  }

  if (config.activeMode !== "flipcard") {
    return NextResponse.json({ error: "Mode tebak gambar sedang tidak aktif." }, { status: 400 });
  }
  if (!config.cardPrizes || config.cardPrizes.length === 0) {
    return NextResponse.json({ error: "Belum ada isi kartu yang diatur." }, { status: 400 });
  }

  const key = deviceId || fingerprint || "unknown";
  const ua = req.headers.get("user-agent") || "";
  const device = parseDevice(ua);

  const plays = await getPlaysData();
  const entry = plays.byDevice[key] ?? { spins: 0, flips: 0, history: [] };

  if (entry.flips >= config.maxFlipsPerDevice) {
    return NextResponse.json(
      { error: "Sudah mencapai batas maksimal buka kartu.", remaining: 0 },
      { status: 403 }
    );
  }

  // Fresh RNG draw every flip — the physical card position tapped (cardIndex)
  // is just which face-down card the player picked visually; it doesn't map
  // to a fixed outcome. This keeps the game fair and unpredictable, and
  // matches how the spin wheel already works.
  const weights = config.cardPrizes.map((p) => p.weight);
  const winIndex = pickWeightedIndex(weights);
  const won = config.cardPrizes[winIndex];

  const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const record: PlayRecord = {
    type: "flip",
    result: won.isZonk ? "Zonk" : won.label,
    time,
    device,
  };

  entry.flips += 1;
  entry.history.push(record);
  plays.byDevice[key] = entry;
  await savePlaysData(plays);

  const remaining = config.maxFlipsPerDevice - entry.flips;

  return NextResponse.json({
    image: won.image,
    label: won.label,
    isZonk: won.isZonk,
    remaining,
  });
}
