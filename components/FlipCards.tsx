"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { getOrCreateDeviceId, getDeviceFingerprint } from "@/lib/device";
import { CARD_COUNT } from "@/lib/types";

type FlipResult = { image: string | null; label: string; isZonk: boolean };

export default function FlipCards() {
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<FlipResult | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const deviceIdRef = useRef("");
  const fingerprintRef = useRef("");

  useEffect(() => {
    deviceIdRef.current = getOrCreateDeviceId();
    getDeviceFingerprint().then((fp) => {
      fingerprintRef.current = fp;
      const params = new URLSearchParams({ deviceId: deviceIdRef.current, fp });
      fetch(`/api/play/flip?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setRemaining(typeof d.remaining === "number" ? d.remaining : null))
        .catch(() => setRemaining(null));
    });
  }, []);

  async function handleFlip(index: number) {
    if (flippedIndex !== null || loadingIndex !== null) return;
    if (remaining !== null && remaining <= 0) {
      setLimitMsg("Jatah buka kartunya udah abis.");
      return;
    }

    setLoadingIndex(index);
    setLimitMsg(null);

    try {
      const res = await fetch("/api/play/flip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardIndex: index,
          deviceId: deviceIdRef.current,
          fingerprint: fingerprintRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoadingIndex(null);
        setLimitMsg(data.error || "Gagal buka kartu, coba lagi.");
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      setFlippedIndex(index);
      setResult({ image: data.image, label: data.label, isZonk: data.isZonk });
    } catch {
      setLimitMsg("Koneksinya lagi bermasalah, coba lagi.");
    } finally {
      setLoadingIndex(null);
    }
  }

  function reset() {
    setFlippedIndex(null);
    setResult(null);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: CARD_COUNT }).map((_, i) => {
          const isFlipped = flippedIndex === i;
          const isLoading = loadingIndex === i;
          const isLocked = flippedIndex !== null && flippedIndex !== i;

          return (
            <button
              key={i}
              onClick={() => handleFlip(i)}
              disabled={flippedIndex !== null || loadingIndex !== null}
              className="relative aspect-[3/4] w-16 sm:w-20 [perspective:800px]"
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="relative h-full w-full [transform-style:preserve-3d]"
              >
                {/* card back */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-xl border-2 border-gold/60 bg-gradient-to-br from-mid to-deep text-2xl shadow-lg transition-opacity [backface-visibility:hidden] ${
                    isLocked ? "opacity-30" : "opacity-100"
                  } ${isLoading ? "animate-pulse" : ""}`}
                >
                  ✦
                </div>

                {/* card front */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-gold bg-ink [backface-visibility:hidden]"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  {isFlipped && result && (
                    <>
                      {result.image ? (
                        <div className="relative h-full w-full">
                          <Image src={result.image} alt={result.label} fill className="object-cover" />
                        </div>
                      ) : (
                        <span className="px-1 text-center text-[10px] font-semibold text-white">
                          {result.isZonk ? "Zonk" : result.label}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      {remaining !== null && <p className="text-xs text-white/50">Sisa kesempatan: {remaining}</p>}
      {limitMsg && <p className="text-sm text-rose">{limitMsg}</p>}

      <AnimatePresence>
        {result && flippedIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="glass flex flex-col items-center gap-3 rounded-2xl px-8 py-5 text-center"
          >
            <p className="font-body text-sm uppercase tracking-widest text-rose/90">
              {result.isZonk ? "Yah..." : "Kamu dapat"}
            </p>
            <p className="font-display text-2xl font-bold text-white">
              {result.isZonk ? "Zonk" : result.label}
            </p>
            {remaining !== null && remaining > 0 && (
              <button
                onClick={reset}
                className="mt-1 rounded-full bg-gold px-6 py-2 text-sm font-bold text-ink transition-transform active:scale-95"
              >
                Buka lagi
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
