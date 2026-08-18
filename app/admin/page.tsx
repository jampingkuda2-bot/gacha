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

// Rounds a weight to one decimal place — enough precision to dial a rate
// down to 0.1% once the pool is normalized to a 100-point total.
function round1(n: number) {
  return Math.round(n * 10) / 10;
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
  // Rescales every prize's weight so the pool sums to exactly 100 — once
  // that's true, each "rate" number *is* its drop-rate percentage, so
  // typing 0.1 gives an exact 0.1% chance.
  function normalizePrizesToHundred() {
    setConfig((c) => {
      if (!c) return c;
      const total = c.prizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
      if (total <= 0) return c;
      const prizes = c.prizes.map((p) => ({ ...p, weight: round1((Math.max(0, p.weight) / total) * 100) }));
      return { ...c, prizes };
    });
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
  function normalizeCardPrizesToHundred() {
    setConfig((c) => {
      if (!c) return c;
      const total = c.cardPrizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
      if (total <= 0) return c;
      const cardPrizes = c.cardPrizes.map((p) => ({ ...p, weight: round1((Math.max(0, p.weight) / total) * 100) }));
      return { ...c, cardPrizes };
    });
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
      <div className="flex min-h-screen items-center justify-center bg-ink text-[15px] text-seclabel">
        Memuat panel...
      </div>
    );
  }

  if (loadError || !config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-white">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose/15 text-2xl">⚠️</div>
        <p className="font-display text-[17px] font-semibold">Gagal memuat data</p>
        <p className="max-w-md break-words rounded-ios border border-separator bg-deep px-4 py-3 font-mono text-[12px] text-seclabel">
          {loadError || "Data tidak diketahui."}
        </p>
        <button onClick={loadConfig} className="ios-btn bg-blue px-6 py-2.5 text-[15px] text-white">
          Coba lagi
        </button>
      </div>
    );
  }

  const zonkCount = config.cardPrizes.filter((p) => p.isZonk).length;
  const prizeTotal = config.prizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
  const cardTotal = config.cardPrizes.reduce((s, p) => s + Math.max(0, p.weight), 0);
  const prizeIsHundred = Math.abs(prizeTotal - 100) < 0.05;
  const cardIsHundred = Math.abs(cardTotal - 100) < 0.05;

  return (
    <div className="min-h-screen bg-ink pb-32 text-white">
      {/* iOS nav bar */}
      <header className="safe-top glass sticky top-0 z-20 border-b border-white/10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <h1 className="font-display text-[20px] font-bold">Panel Kontrol</h1>
          <div className="flex items-center gap-4">
            <a href="/" target="_blank" className="text-[15px] font-medium text-blue">
              Lihat situs
            </a>
            <button onClick={handleLogout} className="text-[15px] font-medium text-rose">
              Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-7 flex max-w-2xl flex-col gap-7 px-5">
        {/* Basic info */}
        <section>
          <p className="ios-section-label mb-2">Info dasar</p>
          <div className="ios-card">
            <label className="ios-row">
              <span className="w-24 shrink-0 text-[15px] text-seclabel">Judul</span>
              <input
                value={config.title}
                onChange={(e) => update("title", e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right text-[15px] text-white outline-none"
              />
            </label>
            <label className="ios-row">
              <span className="w-24 shrink-0 text-[15px] text-seclabel">Subjudul</span>
              <input
                value={config.subtitle}
                onChange={(e) => update("subtitle", e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-right text-[15px] text-white outline-none"
              />
            </label>
          </div>
        </section>

        {/* Mode toggle */}
        <section>
          <p className="ios-section-label mb-2">Mode yang aktif di situs</p>
          <div className="ios-card p-2">
            <div className="ios-segment">
              <button data-active={config.activeMode === "spin"} onClick={() => update("activeMode", "spin")}>
                🎡 Spin Wheel
              </button>
              <button data-active={config.activeMode === "flipcard"} onClick={() => update("activeMode", "flipcard")}>
                🃏 Flip Card
              </button>
            </div>
          </div>
        </section>

        {/* Spin prizes */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="ios-section-label !px-0">Hadiah Spin Wheel</p>
            <button onClick={addPrize} className="text-[13px] font-semibold text-blue">
              + Tambah
            </button>
          </div>
          <p className="mb-2 text-[12px] leading-relaxed text-seclabel">
            Rate = bobot peluang, bukan langsung persen. Tekan{" "}
            <span className="font-semibold text-white">“Samakan ke 100%”</span> supaya tiap rate langsung jadi
            persen aslinya — dari situ kamu bisa ngetik rate presisi seperti <span className="text-gold">0.1</span>{" "}
            buat drop rate <span className="text-gold">0,1%</span>.
          </p>
          <div className="ios-card">
            {config.prizes.map((prize, i) => {
              const pct = prizeTotal > 0 ? (Math.max(0, prize.weight) / prizeTotal) * 100 : 0;
              return (
                <div key={i} className="ios-row">
                  <input
                    value={prize.label}
                    onChange={(e) => updatePrize(i, { label: e.target.value })}
                    placeholder="Nama hadiah"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-tertlabel"
                  />
                  <div className="ios-stepper">
                    <button type="button" onClick={() => updatePrize(i, { weight: Math.max(0, round1(prize.weight - 0.1)) })}>
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min={0}
                      value={prize.weight}
                      onChange={(e) => updatePrize(i, { weight: Math.max(0, Number(e.target.value) || 0) })}
                      className="w-14 bg-transparent text-center text-[14px] text-white outline-none [appearance:textfield]"
                    />
                    <button type="button" onClick={() => updatePrize(i, { weight: round1(prize.weight + 0.1) })}>
                      +
                    </button>
                  </div>
                  <span className="w-14 shrink-0 text-right text-[12px] text-seclabel">{pct.toFixed(1)}%</span>
                  <button onClick={() => removePrize(i)} className="shrink-0 text-[13px] font-medium text-rose">
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className={`text-[12px] ${prizeIsHundred ? "text-green" : "text-seclabel"}`}>
              Total rate: {prizeTotal.toFixed(1)}%{prizeIsHundred ? " ✓" : ""}
            </span>
            <button onClick={normalizePrizesToHundred} className="text-[12px] font-semibold text-blue">
              Samakan ke 100%
            </button>
          </div>

          <div className="ios-card mt-3">
            <div className="ios-row">
              <span className="flex-1 text-[15px] text-white">Batas maksimal putaran per perangkat</span>
              <div className="ios-stepper">
                <button
                  type="button"
                  onClick={() => update("maxSpinsPerDevice", Math.max(1, config.maxSpinsPerDevice - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={config.maxSpinsPerDevice}
                  onChange={(e) => update("maxSpinsPerDevice", Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 bg-transparent text-center text-[14px] text-white outline-none [appearance:textfield]"
                />
                <button type="button" onClick={() => update("maxSpinsPerDevice", config.maxSpinsPerDevice + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Flip card pool */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="ios-section-label !px-0">Isi Flip Card (RNG)</p>
            <button onClick={addCardPrize} className="text-[13px] font-semibold text-blue">
              + Tambah
            </button>
          </div>
          <p className="mb-2 text-[12px] leading-relaxed text-seclabel">
            Hasilnya diacak beneran (RNG) tiap kartu dibuka, bukan posisi tetap. Tandai{" "}
            <span className="font-semibold text-white">Zonk</span> buat yang gak dapat apa-apa. Sekarang ada{" "}
            <span className="text-gold">{zonkCount} entri Zonk</span>.
          </p>
          <div className="ios-card">
            {config.cardPrizes.map((cp, i) => {
              const pct = cardTotal > 0 ? (Math.max(0, cp.weight) / cardTotal) * 100 : 0;
              return (
                <div key={i} className="ios-row items-start py-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-ios border border-white/10 bg-mid">
                    {cp.image ? (
                      <Image src={cp.image} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-tertlabel">
                        {cp.isZonk ? "Zonk" : "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <input
                      value={cp.label}
                      onChange={(e) => updateCardPrize(i, { label: e.target.value })}
                      placeholder="Nama hadiah"
                      className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-tertlabel"
                    />
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="cursor-pointer rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-seclabel active:bg-white/10">
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
                      <label className="flex items-center gap-1.5 text-[12px] text-seclabel">
                        <input
                          type="checkbox"
                          checked={cp.isZonk}
                          onChange={(e) => updateCardPrize(i, { isZonk: e.target.checked })}
                          className="ios-switch"
                          style={{ transform: "scale(0.7)", transformOrigin: "left center" }}
                        />
                        Zonk
                      </label>
                      <div className="ios-stepper">
                        <button
                          type="button"
                          onClick={() => updateCardPrize(i, { weight: Math.max(0, round1(cp.weight - 0.1)) })}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min={0}
                          value={cp.weight}
                          onChange={(e) => updateCardPrize(i, { weight: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-12 bg-transparent text-center text-[13px] text-white outline-none [appearance:textfield]"
                        />
                        <button type="button" onClick={() => updateCardPrize(i, { weight: round1(cp.weight + 0.1) })}>
                          +
                        </button>
                      </div>
                      <span className="text-[12px] text-seclabel">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <button onClick={() => removeCardPrize(i)} className="shrink-0 self-center text-[13px] font-medium text-rose">
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className={`text-[12px] ${cardIsHundred ? "text-green" : "text-seclabel"}`}>
              Total rate: {cardTotal.toFixed(1)}%{cardIsHundred ? " ✓" : ""}
            </span>
            <button onClick={normalizeCardPrizesToHundred} className="text-[12px] font-semibold text-blue">
              Samakan ke 100%
            </button>
          </div>

          <div className="ios-card mt-3">
            <div className="ios-row">
              <span className="flex-1 text-[15px] text-white">Batas maksimal buka kartu per perangkat</span>
              <div className="ios-stepper">
                <button
                  type="button"
                  onClick={() => update("maxFlipsPerDevice", Math.max(1, config.maxFlipsPerDevice - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={config.maxFlipsPerDevice}
                  onChange={(e) => update("maxFlipsPerDevice", Math.max(1, Number(e.target.value) || 1))}
                  className="w-12 bg-transparent text-center text-[14px] text-white outline-none [appearance:textfield]"
                />
                <button type="button" onClick={() => update("maxFlipsPerDevice", config.maxFlipsPerDevice + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Player data */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="ios-section-label !px-0">Kelola data pemain</p>
            <button
              onClick={() => resetPlays()}
              disabled={resettingKey !== null}
              className="text-[13px] font-semibold text-rose disabled:opacity-50"
            >
              {resettingKey === "__all__" ? "Mereset..." : "Reset semua"}
            </button>
          </div>
          <div className="ios-card">
            {playsLoading && <p className="ios-row text-[14px] text-seclabel">Memuat...</p>}
            {!playsLoading && playsData && Object.keys(playsData.byDevice).length === 0 && (
              <p className="ios-row text-[14px] text-seclabel">Belum ada yang pernah main.</p>
            )}
            {!playsLoading &&
              playsData &&
              Object.entries(playsData.byDevice).map(([key, entry]) => {
                const last = entry.history[entry.history.length - 1];
                return (
                  <div key={key} className="ios-row">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-white">{last?.device || "Perangkat tidak dikenal"}</p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-tertlabel">{key}</p>
                      <p className="mt-0.5 text-[12px] text-seclabel">
                        {entry.spins} spin, {entry.flips} flip
                        {last ? ` · terakhir: ${last.result} (${last.time})` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => resetPlays(key)}
                      disabled={resettingKey !== null}
                      className="shrink-0 text-[13px] font-medium text-blue disabled:opacity-50"
                    >
                      {resettingKey === key ? "..." : "Reset"}
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* Sticky save toolbar */}
      <div className="safe-bottom glass fixed inset-x-0 bottom-0 z-20 border-t border-white/10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <div className="text-[13px]">
            {error ? (
              <span className="text-rose">{error}</span>
            ) : savedAt ? (
              <span className="text-green">Tersimpan pukul {savedAt}</span>
            ) : (
              <span className="text-seclabel">Perubahan belum disimpan</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ios-btn bg-blue px-8 py-2.5 text-[15px] text-white disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
