import SpinWheel from "@/components/SpinWheel";
import FlipCards from "@/components/FlipCards";
import { getConfigSafe } from "@/lib/blob";
import { toPublicConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfigSafe();
  const publicConfig = toPublicConfig(config);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink">
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 animate-twinkle rounded-full bg-white"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* iOS large-title nav bar */}
      <div className="safe-top glass sticky top-0 z-20 border-b border-white/10">
        <div className="px-5 pb-3 pt-4">
          <h1 className="font-display text-[28px] font-bold leading-tight tracking-tight text-white">
            {publicConfig.title}
          </h1>
          <p className="mt-0.5 text-[13px] text-seclabel">{publicConfig.subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 flex justify-center px-6 pb-24 pt-12">
        {publicConfig.activeMode === "spin" ? (
          <SpinWheel prizes={publicConfig.prizes} />
        ) : (
          <FlipCards />
        )}
      </div>
    </main>
  );
}
