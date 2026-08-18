"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <form onSubmit={handleSubmit} className="ios-sheet w-full max-w-[300px] animate-sheetIn p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue/15 text-2xl">
          🔒
        </div>
        <h1 className="font-display mt-3 text-[17px] font-semibold text-white">Panel Kontrol Gacha</h1>
        <p className="mt-1 text-[13px] text-seclabel">Masukkan kata sandi untuk masuk.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Kata sandi"
          autoFocus
          className="mt-5 w-full rounded-ios border border-white/10 bg-mid px-4 py-2.5 text-center text-[15px] text-white placeholder-seclabel outline-none focus:border-blue"
        />

        {error && <p className="mt-3 text-[13px] text-rose">{error}</p>}

        <div className="mt-5 -mx-6 -mb-6 flex border-t border-separator">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-[17px] font-semibold text-blue transition active:bg-white/10 disabled:opacity-50"
          >
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
        </div>
      </form>
    </div>
  );
}
