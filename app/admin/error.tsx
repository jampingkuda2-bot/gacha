"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin panel error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
      <p className="font-display text-lg font-bold">Ada error di panel admin</p>
      <p className="max-w-md break-words rounded-xl bg-white/10 px-4 py-3 font-mono text-xs text-white/80">
        {error.message || "(tidak ada pesan error)"}
      </p>
      <button onClick={reset} className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink">
        Coba lagi
      </button>
    </div>
  );
}
