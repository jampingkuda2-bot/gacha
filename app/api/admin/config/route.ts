import { NextRequest, NextResponse } from "next/server";
import { getConfig, saveConfig } from "@/lib/blob";
import { GachaConfig } from "@/lib/types";

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
  const body = (await req.json()) as GachaConfig;

  if (!body.title || !Array.isArray(body.prizes) || !Array.isArray(body.cards)) {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    await saveConfig(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("saveConfig failed:", err);
    const message = err instanceof Error ? err.message : "Gagal menyimpan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
