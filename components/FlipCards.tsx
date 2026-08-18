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
  // Once the picked card's result is shown, the rest of the deck flips over
  // too — real prize artwork for flavor, but NOT another result. The actual
  // outcome is a single draw tied to `result`, not to any specific card.
  const [revealRest, setRevealRest] = useState(false);
  const [revealPool, setRevealPool] = useState<FlipResult[]>([]);
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
      setRevealPool(Array.isArray(data.revealPool) ? data.revealPool : []);
      // Give the player a beat to register their own card's result, then
      // flip the rest of the board over for show.
      setTimeout(() => setRevealRest(true), 900);
    } catch {
      setLimitMsg("Koneksinya lagi bermasalah, coba lagi.");
    } finally {
      setLoadingIndex(null);
    }
  }

  function reset() {
    setFlippedIndex(null);
    setResult(null);
    setRevealRest(false);
    setRevealPool([]);
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
      <div className="grid w-full grid-cols-4 gap-2.5 sm:gap-3.5">
        {Array.from({ length: CARD_COUNT }).map((_, i) => {
          const isPicked = flippedIndex === i;
          const isLoading = loadingIndex === i;
          const isOtherRevealed = revealRest && flippedIndex !== null && flippedIndex !== i;
          const isShowingFront = isPicked || isOtherRevealed;
          const isLocked = flippedIndex !== null && !isPicked && !isOtherRevealed;

          return (
            <button
              key={i}
              onClick={() => handleFlip(i)}
              disabled={flippedIndex !== null || loadingIndex !== null}
              className="relative aspect-[3/4] w-full [perspective:800px]"
            >
              <motion.div
                animate={{ rotateY: isShowingFront ? 180 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut", delay: isOtherRevealed ? i * 0.06 : 0 }}
                className="relative h-full w-full [transform-style:preserve-3d]"
              >
                {/* card back */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-ios border border-white/10 bg-deep text-4xl text-gold shadow-lg transition-opacity [backface-visibility:hidden] ${
                    isLocked ? "opacity-30" : "opacity-100"
                  } ${isLoading ? "animate-pulse" : ""}`}
                >
                  ✦
                </div>

                {/* card front */}
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-ios border border-gold/70 bg-ink [backface-visibility:hidden]"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  {isPicked && result ? (
                    result.image ? (
                      <div className="relative h-full w-full">
                        <Image src={result.image} alt={result.label} fill className="object-cover" />
                      </div>
                    ) : (
                      <span className="px-1 text-center text-[11px] font-semibold text-white">
                        {result.isZonk ? "Zonk" : result.label}
                      </span>
                    )
                  ) : isOtherRevealed ? (
                    (() => {
                      // Not another result — just real prize artwork from
                      // the pool, cycled across the leftover positions, so
                      // the reveal looks alive instead of a blank icon.
                      const item = revealPool.length > 0 ? revealPool[i % revealPool.length] : null;
                      return item?.image ? (
                        <div className="relative h-full w-full opacity-80">
                          <Image src={item.image} alt={item.label} fill className="object-cover" />
                        </div>
                      ) : (
                        <span className="px-1 text-center text-[10px] font-semibold text-white/70">
                          {item ? (item.isZonk ? "Zonk" : item.label) : ""}
                        </span>
                      );
                    })()
                  ) : null}
                </div>
              </motion.div>
            </button>
          );
        })}
      </div>

      {remaining !== null && <p className="text-[13px] text-seclabel">Sisa kesempatan: {remaining}</p>}
      {limitMsg && <p className="text-[15px] text-rose">{limitMsg}</p>}

      <AnimatePresence>
        {result && flippedIndex !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="ios-sheet flex flex-col items-center gap-3 px-8 py-6 text-center"
          >
            <p className={`font-body text-[13px] font-semibold uppercase tracking-wide ${result.isZonk ? "text-rose" : "text-gold"}`}>
              {result.isZonk ? "Yah..." : "Kamu dapat"}
            </p>
            <p className="font-display text-[24px] font-bold text-white">
              {result.isZonk ? "Zonk" : result.label}
            </p>
            {remaining !== null && remaining > 0 && (
              <button onClick={reset} className="ios-btn mt-1 bg-blue px-6 py-2.5 text-[15px] text-white">
                Buka lagi
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
