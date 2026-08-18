import { NextRequest, NextResponse } from "next/server";
import { getConfigSafe } from "@/lib/blob";
import { getPlaysData, savePlaysData, PlayRecord } from "@/lib/plays";
import { parseDevice } from "@/lib/device";
import { sendPlayNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export async function GET(req: NextRequest) {
  const config = await getConfigSafe();
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get("deviceId") || "";
  const fingerprint = searchParams.get("fp") || "";
  const key = deviceId || fingerprint || "unknown";

  const plays = await getPlaysData();
  const used = plays.byDevice[key]?.spins ?? 0;
  return NextResponse.json({
    remaining: Math.max(0, config.maxSpinsPerDevice - used),
    max: config.maxSpinsPerDevice,
  });
}

export async function POST(req: NextRequest) {
  const config = await getConfigSafe();
  if (config.activeMode !== "spin") {
    return NextResponse.json({ error: "Mode spin sedang tidak aktif." }, { status: 400 });
  }
  if (!config.prizes || config.prizes.length === 0) {
    return NextResponse.json({ error: "Belum ada hadiah yang diatur." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";
  const fingerprint = typeof body.fingerprint === "string" ? body.fingerprint : "";
  const key = deviceId || fingerprint || "unknown";

  const ua = req.headers.get("user-agent") || "";
  const device = parseDevice(ua);

  const plays = await getPlaysData();
  const entry = plays.byDevice[key] ?? { spins: 0, flips: 0, history: [] };

  if (entry.spins >= config.maxSpinsPerDevice) {
    return NextResponse.json(
      { error: "Sudah mencapai batas maksimal putaran.", remaining: 0 },
      { status: 403 }
    );
  }

  const weights = config.prizes.map((p) => p.weight);
  const index = pickWeightedIndex(weights);
  const prizeLabel = config.prizes[index].label;

  const time = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const record: PlayRecord = { type: "spin", result: prizeLabel, time, device };

  entry.spins += 1;
  entry.history.push(record);
  plays.byDevice[key] = entry;
  await savePlaysData(plays);

  await sendPlayNotification({ type: "spin", result: prizeLabel, device, time, key });

  const remaining = config.maxSpinsPerDevice - entry.spins;

  return NextResponse.json({ index, prize: prizeLabel, remaining });
}
