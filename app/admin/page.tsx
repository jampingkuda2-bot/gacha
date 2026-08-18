"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { GachaConfig, normalizeConfig } from "@/lib/types";
import type { PlaysData } from "@/lib/plays";

async function uploadImage(file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Ukuran gambar maksimal 15MB.");
  }
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload",
  });
  return blob.url;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [config, setConfig] = useState<GachaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [playsData, setPlaysData] = useState<PlaysData | null>(null);
  const [playsLoading, setPlaysLoading] = useState(true);
  const [resettingKey, setResettingKey] = useState<string | null>(null);

  function loadConfig() {
    setLoading(true);
    setLoadError(null);
    fetch("/api/admin/config")
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Gagal mengambil data tersimpan.");
        setConfig(normalizeConfig(data));
      })
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Gagal mengambil data tersimpan."))
      .finally(() => setLoading(false));
  }

  function loadPlaysData() {
    setPlaysLoading(true);
    fetch("/api/admin/plays")
      .then((r) => r.json())
      .then((data) => setPlaysData(data))
      .catch(() => setPlaysData(null))
      .finally(() => setPlaysLoading(false));
  }

  useEffect(() => {
    loadConfig();
    loadPlaysData();
  }, []);

  async function resetPlays(key?: string) {
    setResettingKey(key ?? "__all__");
    try {
      const url = key ? `/api/admin/plays?key=${encodeURIComponent(key)}` : "/api/admin/plays";
      await fetch(url, { method: "DELETE" });
      loadPlaysData();
    } finally {
      setResettingKey(null);
    }
  }

  function update<K extends keyof GachaConfig>(key: K, value: GachaConfig[K]) {
    setConfig((c) => (c ? { ...c, [key]: value } : c));
  }

  function updatePrize(index: number, patch: Partial<GachaConfig["prizes"][number]>) {
    setConfig((c) => {
      if (!c) return c;
      const prizes = [...c.prizes];
      prizes[index] = { ...prizes[index], ...patch };
      return { ...c, prizes };
    });
  }
  function addPrize() {
    setConfig((c) => (c ? { ...c, prizes: [...c.prizes, { label: "Hadiah baru", weight: 1 }] } : c));
  }
  function removePrize(index: number) {
    setConfig((c) => (c ? { ...c, prizes: c.prizes.filter((_, i) => i !== index) } : c));
  }

  function updateCardPrize(index: number, patch: Partial<GachaConfig["cardPrizes"][number]>) {
    setConfig((c) => {
      if (!c) return c;
      const cardPrizes = [...c.cardPrizes];
      cardPrizes[index] = { ...cardPrizes[index], ...patch };
      return { ...c, cardPrizes };
    });
  }
  function addCardPrize() {
    setConfig((c) =>
      c
        ? { ...c, cardPrizes: [...c.cardPrizes, { label: "Hadiah baru", image: null, weight: 1, isZonk: false }] }
        : c
    );
  }
  function removeCardPrize(index: number) {
    setConfig((c) => (c ? { ...c, cardPrizes: c.cardPrizes.filter((_, i) => i !== index) } : c));
  }

  async function handleCardImageUpload(index: number, file: File) {
    setBusySlot(`card-${index}`);
    setError(null);
    try {
      const url = await uploadImage(file);
      updateCardPrize(index, { image: url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload gagal");
    } finally {
      setBusySlot(null);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyimpan");
      }
      setSavedAt(new Date().toLocaleTimeString("id-ID"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-white/70">
        Memuat panel...
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
        <p className="font-display text-lg font-bold">Gagal memuat data</p>
        <p className="max-w-md break-words rounded-xl bg-white/10 px-4 py-3 font-mono text-xs text-white/80">
          {loadError || "Data tidak diketahui."}
        </p>
        <button onClick={loadConfig} className="mt-2 rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-ink">
          Coba lagi
        </button>
      </div>
    );
  }

  const zonkCount = config.cardPrizes.filter((p) => p.isZonk).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-deep pb-32 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="font-display text-xl font-bold">Panel Kontrol Gacha</h1>
          <div className="flex gap-2">
            <a href="/" target="_blank" className="rounded-full border border-white/20 px-4 py-2 text-xs hover:bg-white/10">
              Lihat situs
            </a>
            <button onClick={handleLogout} className="rounded-full border border-white/20 px-4 py-2 text-xs hover:bg-white/10">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-8 px-6">
        {/* Basic info + mode */}
        <section className="glass rounded-2xl p-6">
          <h2 className="font-display text-lg font-bold">Info dasar</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Judul
              <input
                value={config.title}
                onChange={(e) => update("title", e.target.value)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 outline-none focus:border-gold"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Subjudul
              <input
                value={config.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 outline-none focus:border-gold"
              />
            </label>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-sm font-semibold">Mode yang aktif di situs</p>
            <div className="mt-2 flex gap-3">
              <button
                onClick={() => update("activeMode", "spin")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  config.activeMode === "spin" ? "border-gold bg-gold/20 text-gold" : "border-white/20 text-white/70"
                }`}
              >
                🎡 Spin Wheel
              </button>
              <button
                onClick={() => update("activeMode", "flipcard")}
                className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${
                  config.activeMode === "flipcard" ? "border-gold bg-gold/20 text-gold" : "border-white/20 text-white/70"
                }`}
              >
                🃏 Flip Card
              </button>
            </div>
          </div>
        </section>

        {/* Spin prizes */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Hadiah Spin Wheel</h2>
            <button onClick={addPrize} className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink">
              + Tambah
            </button>
          </div>
          <p className="mt-1 text-xs text-white/60">
            "Rate" itu bobot peluang — rate sama, peluang rata; makin gede, makin sering keluar.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {config.prizes.map((prize, i) => {
              const total = config.prizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
              const pct = total > 0 ? Math.round((Math.max(0, prize.weight) / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={prize.label}
                    onChange={(e) => updatePrize(i, { label: e.target.value })}
                    className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm outline-none focus:border-gold"
                  />
                  <input
                    type="number"
                    min={0}
                    value={prize.weight}
                    onChange={(e) => updatePrize(i, { weight: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-16 shrink-0 rounded-lg border border-white/25 bg-white/10 px-2 py-2 text-center text-sm outline-none focus:border-gold"
                  />
                  <span className="w-10 shrink-0 text-right text-[11px] text-white/50">{pct}%</span>
                  <button onClick={() => removePrize(i)} className="shrink-0 text-xs text-red-300 hover:text-red-200">
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            Batas maksimal putaran per perangkat
            <input
              type="number"
              min={1}
              value={config.maxSpinsPerDevice}
              onChange={(e) => update("maxSpinsPerDevice", Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-center text-sm outline-none focus:border-gold"
            />
          </label>
        </section>

        {/* Flip card pool */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Isi Flip Card (RNG)</h2>
            <button onClick={addCardPrize} className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold text-ink">
              + Tambah
            </button>
          </div>
          <p className="mt-1 text-xs text-white/60">
            Ini kumpulan kemungkinan hasil pas kartu dibuka — hasilnya diacak beneran (RNG) tiap kartu
            dibuka, bukan posisi tetap. Tandai "Zonk" buat yang gak dapat apa-apa. Sekarang ada{" "}
            <span className="text-gold">{zonkCount} entri Zonk</span>.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {config.cardPrizes.map((cp, i) => {
              const total = config.cardPrizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
              const pct = total > 0 ? Math.round((Math.max(0, cp.weight) / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/20 bg-white/5">
                    {cp.image ? (
                      <Image src={cp.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-white/40">
                        {cp.isZonk ? "Zonk" : "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <input
                      value={cp.label}
                      onChange={(e) => updateCardPrize(i, { label: e.target.value })}
                      className="w-full rounded-lg border border-white/25 bg-white/10 px-2 py-1.5 text-sm outline-none focus:border-gold"
                    />
                    <div className="flex items-center gap-2 text-xs">
                      <label className="cursor-pointer rounded-full border border-white/25 px-2 py-1 hover:bg-white/10">
                        {busySlot === `card-${i}` ? "..." : "Foto"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCardImageUpload(i, file);
                          }}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={cp.isZonk}
                          onChange={(e) => updateCardPrize(i, { isZonk: e.target.checked })}
                        />
                        Zonk
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cp.weight}
                        onChange={(e) => updateCardPrize(i, { weight: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-14 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-center outline-none focus:border-gold"
                      />
                      <span className="text-white/50">{pct}%</span>
                    </div>
                  </div>
                  <button onClick={() => removeCardPrize(i)} className="shrink-0 text-xs text-red-300 hover:text-red-200">
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            Batas maksimal buka kartu per perangkat
            <input
              type="number"
              min={1}
              value={config.maxFlipsPerDevice}
              onChange={(e) => update("maxFlipsPerDevice", Math.max(1, Number(e.target.value) || 1))}
              className="w-20 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-center text-sm outline-none focus:border-gold"
            />
          </label>
        </section>

        {/* Player data */}
        <section className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Kelola data pemain</h2>
            <button
              onClick={() => resetPlays()}
              disabled={resettingKey !== null}
              className="rounded-full border border-red-300/50 px-4 py-1.5 text-xs font-bold text-red-300 hover:bg-red-300/10 disabled:opacity-50"
            >
              {resettingKey === "__all__" ? "Mereset..." : "Reset semua"}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {playsLoading && <p className="text-sm text-white/50">Memuat...</p>}
            {!playsLoading && playsData && Object.keys(playsData.byDevice).length === 0 && (
              <p className="text-sm text-white/50">Belum ada yang pernah main.</p>
            )}
            {!playsLoading &&
              playsData &&
              Object.entries(playsData.byDevice).map(([key, entry]) => {
                const last = entry.history[entry.history.length - 1];
                return (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 p-3">
                    <div className="min-w-0">
                      <p className="text-xs text-white/80">{last?.device || "Perangkat tidak dikenal"}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-white/40">{key}</p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {entry.spins} spin, {entry.flips} flip
                        {last ? ` · terakhir: ${last.result} (${last.time})` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => resetPlays(key)}
                      disabled={resettingKey !== null}
                      className="shrink-0 rounded-full border border-white/25 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-50"
                    >
                      {resettingKey === key ? "..." : "Reset"}
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="text-xs text-white/60">
            {error ? <span className="text-red-300">{error}</span> : savedAt ? `Tersimpan pukul ${savedAt}` : "Perubahan belum disimpan"}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-gold px-8 py-2.5 font-bold text-ink disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
