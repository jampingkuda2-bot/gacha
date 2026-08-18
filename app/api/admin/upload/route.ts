import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
          addRandomSuffix: true,
          maximumSizeInBytes: 15 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // no-op
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    console.error("upload token generation failed:", err);
    const message = err instanceof Error ? err.message : "Upload gagal.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
