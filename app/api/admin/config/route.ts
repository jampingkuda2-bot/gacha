import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/blob";
import { GachaConfig, normalizeConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json(config);
  } catch (err) {
    console.error("admin GET config failed:", err);
    const message = err instanceof Error ? err.message : "Gagal mengambil data tersimpan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<GachaConfig>;

  if (!body.title || !Array.isArray(body.prizes) || !Array.isArray(body.cardPrizes)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    // Sanitize/normalize so malformed or partial payloads never corrupt the
    // stored config (e.g. NaN weights, missing fields from an old client).
    const clean = normalizeConfig(body);
    await saveConfig(clean);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("saveConfig failed:", err);
    const message = err instanceof Error ? err.message : "Gagal menyimpan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
