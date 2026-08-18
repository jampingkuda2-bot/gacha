import { NextRequest, NextResponse } from "next/server";
import { getPlaysData, savePlaysData } from "@/lib/plays";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getPlaysData();
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  try {
    const data = await getPlaysData();
    if (key) {
      delete data.byDevice[key];
    } else {
      data.byDevice = {};
    }
    await savePlaysData(data);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reset plays failed:", err);
    return NextResponse.json({ error: "Gagal mereset data." }, { status: 500 });
  }
}
