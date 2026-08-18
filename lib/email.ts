// Sends a "someone just played" notification email via Resend
// (https://resend.com). Configured entirely through env vars so it's a
// no-op (silently skipped) until RESEND_API_KEY and NOTIFY_EMAIL are set —
// this keeps local dev and preview deploys working without an API key.

type NotifyParams = {
  type: "spin" | "flip";
  result: string;
  isZonk?: boolean;
  device: string;
  time: string;
  key: string;
};

export async function sendPlayNotification(params: NotifyParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  if (!apiKey || !to) return; // not configured — skip quietly

  const from = process.env.NOTIFY_FROM_EMAIL || "Gacha Time <onboarding@resend.dev>";
  const modeLabel = params.type === "spin" ? "Spin Wheel" : "Flip Card";
  const resultLabel = params.isZonk ? "Zonk" : params.result;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `🎰 ${modeLabel}: ${resultLabel}`,
        html: `
          <div style="font-family:sans-serif;font-size:14px;color:#1c1c1e">
            <p style="font-size:16px;margin:0 0 12px"><strong>${modeLabel}</strong> baru saja dimainkan.</p>
            <table cellpadding="6" style="border-collapse:collapse">
              <tr><td style="color:#8e8e93">Hasil</td><td><strong>${resultLabel}</strong></td></tr>
              <tr><td style="color:#8e8e93">Perangkat</td><td>${params.device}</td></tr>
              <tr><td style="color:#8e8e93">Waktu</td><td>${params.time}</td></tr>
              <tr><td style="color:#8e8e93">ID perangkat</td><td style="font-family:monospace;font-size:12px">${params.key}</td></tr>
            </table>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend notification failed:", res.status, body);
    }
  } catch (err) {
    // Never let an email failure break the actual spin/flip response.
    console.error("Resend notification error:", err);
  }
}
