import SpinWheel from "@/components/SpinWheel";
import FlipCards from "@/components/FlipCards";
import { getConfigSafe } from "@/lib/blob";
import { toPublicConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getConfigSafe();
  const publicConfig = toPublicConfig(config);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-ink via-deep to-mid px-6 py-16">
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

      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
          {publicConfig.title}
        </h1>
        <p className="text-sm text-white/70">{publicConfig.subtitle}</p>
      </div>

      <div className="relative z-10 mt-12 flex justify-center">
        {publicConfig.activeMode === "spin" ? (
          <SpinWheel prizes={publicConfig.prizes} />
        ) : (
          <FlipCards />
        )}
      </div>
    </main>
  );
}
