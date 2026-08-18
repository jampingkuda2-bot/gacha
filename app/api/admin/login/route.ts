import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, checkPassword, getExpectedToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Server belum dikonfigurasi. Set ADMIN_PASSWORD dan ADMIN_SECRET di environment variables." },
      { status: 500 }
    );
  }

  const ok = await checkPassword(password || "");
  if (!ok) {
    return NextResponse.json({ error: "Password salah." }, { status: 401 });
  }

  const token = await getExpectedToken();
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, token as string, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
