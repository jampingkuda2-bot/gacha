import type { Metadata, Viewport } from "next";
import { Baloo_2, Poppins, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
});
const body = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Gacha Time 🎰",
  description: "Coba keberuntunganmu",
};

export const viewport: Viewport = {
  themeColor: "#1A1233",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body`}>
        {children}
      </body>
    </html>
  );
}
