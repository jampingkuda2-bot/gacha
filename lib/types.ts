export type Prize = {
  label: string;
  weight: number;
};

export type CardPrize = {
  label: string;
  image: string | null;
  weight: number;
  isZonk: boolean;
};

export type GachaMode = "spin" | "flipcard";

export const CARD_COUNT = 8;

export type GachaConfig = {
  title: string;
  subtitle: string;
  activeMode: GachaMode;
  prizes: Prize[]; // spin wheel pool
  cardPrizes: CardPrize[]; // flip-card pool — outcome is a fresh RNG draw
  // from this pool every time a card is flipped, independent of which of
  // the CARD_COUNT face-down cards was physically tapped.
  maxSpinsPerDevice: number;
  maxFlipsPerDevice: number;
};

export const DEFAULT_CONFIG: GachaConfig = {
  title: "Gacha Time 🎰",
  subtitle: "Coba keberuntunganmu",
  activeMode: "spin",
  prizes: [
    { label: "Hadiah A", weight: 1 },
    { label: "Hadiah B", weight: 1 },
    { label: "Hadiah C", weight: 1 },
  ],
  cardPrizes: [
    { label: "Hadiah 1", image: null, weight: 1, isZonk: false },
    { label: "Hadiah 2", image: null, weight: 1, isZonk: false },
    { label: "Hadiah 3", image: null, weight: 1, isZonk: false },
    { label: "Zonk", image: null, weight: 1, isZonk: true },
    { label: "Zonk", image: null, weight: 1, isZonk: true },
  ],
  maxSpinsPerDevice: 30,
  maxFlipsPerDevice: 1,
};

/**
 * Fills in any missing/invalid fields from older saved data with sane
 * defaults.
 */
export function normalizeConfig(data: Partial<GachaConfig>): GachaConfig {
  const merged: GachaConfig = { ...DEFAULT_CONFIG, ...data };

  merged.title = typeof data.title === "string" && data.title.trim() ? data.title : DEFAULT_CONFIG.title;
  merged.subtitle =
    typeof data.subtitle === "string" && data.subtitle.trim() ? data.subtitle : DEFAULT_CONFIG.subtitle;
  merged.activeMode = data.activeMode === "flipcard" ? "flipcard" : "spin";

  const rawPrizes: unknown[] = Array.isArray(data.prizes) ? data.prizes : [];
  const prizes: Prize[] = rawPrizes.map((p) => {
    if (p && typeof p === "object") {
      const obj = p as { label?: unknown; weight?: unknown };
      const label = typeof obj.label === "string" && obj.label.trim() ? obj.label : "Hadiah";
      const weight = typeof obj.weight === "number" && obj.weight > 0 ? obj.weight : 1;
      return { label, weight };
    }
    return { label: "Hadiah", weight: 1 };
  });
  merged.prizes = prizes.length > 0 ? prizes : DEFAULT_CONFIG.prizes;

  const rawCardPrizes: unknown[] = Array.isArray(data.cardPrizes) ? data.cardPrizes : [];
  const cardPrizes: CardPrize[] = rawCardPrizes.map((p) => {
    if (p && typeof p === "object") {
      const obj = p as { label?: unknown; image?: unknown; weight?: unknown; isZonk?: unknown };
      return {
        label: typeof obj.label === "string" && obj.label.trim() ? obj.label : "Hadiah",
        image: typeof obj.image === "string" && obj.image.trim() ? obj.image : null,
        weight: typeof obj.weight === "number" && obj.weight > 0 ? obj.weight : 1,
        isZonk: typeof obj.isZonk === "boolean" ? obj.isZonk : false,
      };
    }
    return { label: "Hadiah", image: null, weight: 1, isZonk: false };
  });
  merged.cardPrizes = cardPrizes.length > 0 ? cardPrizes : DEFAULT_CONFIG.cardPrizes;

  merged.maxSpinsPerDevice =
    typeof data.maxSpinsPerDevice === "number" && data.maxSpinsPerDevice > 0
      ? data.maxSpinsPerDevice
      : DEFAULT_CONFIG.maxSpinsPerDevice;
  merged.maxFlipsPerDevice =
    typeof data.maxFlipsPerDevice === "number" && data.maxFlipsPerDevice > 0
      ? data.maxFlipsPerDevice
      : DEFAULT_CONFIG.maxFlipsPerDevice;

  return merged;
}

/**
 * The subset of config safe to expose to the public page. Deliberately
 * excludes cardPrizes (images/labels/zonk status) — those must only be
 * revealed one at a time via /api/play/flip's RNG draw, never sent upfront,
 * or someone could inspect devtools and see every possible outcome before
 * playing.
 */
export type PublicGachaConfig = {
  title: string;
  subtitle: string;
  activeMode: GachaMode;
  prizes: Prize[];
};

export function toPublicConfig(config: GachaConfig): PublicGachaConfig {
  return {
    title: config.title,
    subtitle: config.subtitle,
    activeMode: config.activeMode,
    prizes: config.prizes,
  };
}

export function pickWeightedIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return i;
  }
  return weights.length - 1;
}
