import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Inter, Instrument_Serif } from "next/font/google";
import { profile } from "@/data/profile";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

const description =
  "Ritvik Kalsotra — M.Sc. Biotechnology. Structural bioinformatics, molecular modelling, computational drug discovery and transcriptomics. An interactive journey from DNA to protein structure.";

export const metadata: Metadata = {
  title: `${profile.name} · Structural bioinformatics & transcriptomics`,
  description,
  authors: [{ name: profile.name }],
  openGraph: {
    title: `${profile.name} · From sequence to structure`,
    description,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#070b12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrument.variable} ${plexMono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
