"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getOrCreateDeviceId, getDeviceFingerprint } from "@/lib/device";
import { Prize } from "@/lib/types";

// iOS system-color palette for wheel segments
const PALETTE = ["#0A84FF", "#BF5AF2", "#FF375F", "#FF9F0A", "#32D74B", "#64D2FF"];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

export default function SpinWheel({ prizes }: { prizes: Prize[] }) {
  const labels = useMemo(() => prizes.map((p) => p.label), [prizes]);
  const n = labels.length;
  const segmentAngle = 360 / n;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitMsg, setLimitMsg] = useState<string | null>(null);
  const rotationRef = useRef(0);
  const deviceIdRef = useRef("");
  const fingerprintRef = useRef("");

  const SPIN_DURATION = 4.2;
  const size = 320;
  const radius = size / 2;

  useEffect(() => {
    deviceIdRef.current = getOrCreateDeviceId();
    getDeviceFingerprint().then((fp) => {
      fingerprintRef.current = fp;
      const params = new URLSearchParams({ deviceId: deviceIdRef.current, fp });
      fetch(`/api/play/spin?${params.toString()}`)
        .then((r) => r.json())
        .then((d) => setRemaining(typeof d.remaining === "number" ? d.remaining : null))
        .catch(() => setRemaining(null));
    });
  }, []);

  const segments = useMemo(
    () =>
      labels.map((label, i) => {
        const startAngle = i * segmentAngle;
        const endAngle = (i + 1) * segmentAngle;
        const mid = startAngle + segmentAngle / 2;
        return {
          label,
          path: arcPath(radius, radius, radius - 4, startAngle, endAngle),
          color: PALETTE[i % PALETTE.length],
          mid,
        };
      }),
    [labels, segmentAngle, radius]
  );

  async function handleSpin() {
    if (spinning || n === 0) return;
    if (remaining !== null && remaining <= 0) {
      setLimitMsg("Jatah puterannya udah abis.");
      return;
    }

    setSpinning(true);
    setResult(null);
    setLimitMsg(null);

    let winnerIndex = 0;
    let prizeLabel = "";

    try {
      const res = await fetch("/api/play/spin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: deviceIdRef.current, fingerprint: fingerprintRef.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSpinning(false);
        setLimitMsg(data.error || "Gagal memutar, coba lagi.");
        if (typeof data.remaining === "number") setRemaining(data.remaining);
        return;
      }
      winnerIndex = data.index;
      prizeLabel = data.prize;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch {
      setSpinning(false);
      setLimitMsg("Koneksinya lagi bermasalah, coba lagi.");
      return;
    }

    const target = (360 - (winnerIndex * segmentAngle + segmentAngle / 2) + 360) % 360;
    const current = rotationRef.current % 360;
    const forwardDelta = ((target - current) % 360 + 360) % 360;
    const newRotation = rotationRef.current + 6 * 360 + forwardDelta;
    rotationRef.current = newRotation;
    setRotation(newRotation);

    window.setTimeout(() => {
      setSpinning(false);
      setResult(prizeLabel);
    }, SPIN_DURATION * 1000);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative mx-auto aspect-square w-full max-w-[300px]">
        <div className="absolute left-1/2 -top-3 z-20 -translate-x-1/2">
          <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
            <path d="M14 34L0 6C0 2.68629 2.68629 0 6 0H22C25.3137 0 28 2.68629 28 6L14 34Z" fill="#FFD60A" />
          </svg>
        </div>

        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: SPIN_DURATION, ease: [0.12, 0.67, 0.1, 1] }}
          className="h-full w-full rounded-full shadow-[0_0_60px_rgba(255,214,10,0.25)] ring-4 ring-white/20"
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
            {segments.map((seg, i) => (
              <path key={i} d={seg.path} fill={seg.color} stroke="#ffffff" strokeWidth="2" />
            ))}
            {segments.map((seg, i) => {
              const pos = polarToCartesian(radius, radius, radius * 0.62, seg.mid);
              return (
                <text
                  key={i}
                  x={pos.x}
                  y={pos.y}
                  fill="#ffffff"
                  fontSize="12.5"
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${seg.mid}, ${pos.x}, ${pos.y})`}
                  style={{ fontFamily: "var(--font-sf)" }}
                >
                  {seg.label}
                </text>
              );
            })}
            <circle cx={radius} cy={radius} r={radius * 0.16} fill="#000000" stroke="#FFD60A" strokeWidth="3" />
          </svg>
        </motion.div>
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning || n === 0}
        className="ios-btn min-w-[220px] bg-blue px-10 py-4 text-center text-[17px] text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-40"
      >
        {spinning ? "Berputar..." : "Putar sekarang"}
      </button>

      {remaining !== null && <p className="-mt-4 text-[13px] text-seclabel">Sisa puteran: {remaining}</p>}
      {limitMsg && <p className="text-[15px] text-rose">{limitMsg}</p>}

      {result && !spinning && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="ios-sheet px-8 py-6 text-center"
        >
          <p className="font-body text-[13px] font-semibold uppercase tracking-wide text-gold">Kamu dapat</p>
          <p className="font-display mt-1 text-[28px] font-bold text-white">{result}</p>
        </motion.div>
      )}
    </div>
  );
}
