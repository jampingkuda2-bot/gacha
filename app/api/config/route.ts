import { NextResponse } from "next/server";
import { getConfigSafe } from "@/lib/blob";
import { toPublicConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getConfigSafe();
  return NextResponse.json(toPublicConfig(config));
}
