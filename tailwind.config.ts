import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // iOS system dark-mode palette (matches Apple's Human Interface
        // Guidelines dark values) — used everywhere instead of the old
        // custom purple brand palette so the app reads as native iOS.
        ink: "#000000", // systemBackground (dark)
        deep: "#1C1C1E", // secondarySystemBackground (dark) / elevated card
        mid: "#2C2C2E", // tertiarySystemBackground (dark) / input fill
        bright: "#3A3A3C", // quaternary fill / separators on cards
        label: "#FFFFFF",
        seclabel: "#98989F", // secondaryLabel
        tertlabel: "#5C5C60", // tertiaryLabel
        separator: "#38383A",
        gold: "#FFD60A", // systemYellow — "you won" accent
        amber: "#FF9F0A", // systemOrange
        rose: "#FF453A", // systemRed — zonk / errors
        blue: "#0A84FF", // systemBlue — primary actions
        green: "#32D74B", // systemGreen — success / on-switch
        purple: "#BF5AF2", // systemPurple
        pink: "#FF375F", // systemPink
        cloud: "#FFFFFF",
      },
      fontFamily: {
        display: ["var(--font-sf)"],
        body: ["var(--font-sf)"],
        mono: ["var(--font-sf-mono)"],
      },
      borderRadius: {
        ios: "14px",
        "ios-lg": "20px",
        "ios-xl": "28px",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.2", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        sheetIn: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        twinkle: "twinkle 2.4s ease-in-out infinite",
        floaty: "floaty 4s ease-in-out infinite",
        sheetIn: "sheetIn 0.28s cubic-bezier(0.25,1,0.5,1)",
      },
    },
  },
  plugins: [],
};
export default config;
