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
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose/15 text-2xl">⚠️</div>
      <p className="font-display text-[17px] font-semibold">Ada error di panel admin</p>
      <p className="max-w-md break-words rounded-ios border border-separator bg-deep px-4 py-3 font-mono text-[12px] text-seclabel">
        {error.message || "(tidak ada pesan error)"}
      </p>
      <button onClick={reset} className="ios-btn bg-blue px-6 py-2.5 text-[15px] text-white">
        Coba lagi
      </button>
    </div>
  );
}
