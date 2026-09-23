import type { Metadata, Viewport } from "next";
import { Fraunces, Public_Sans, DM_Sans, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-fraunces",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-public",
  display: "swap",
});

/* v0 design-system faces (dark "knowledge field" surfaces) */
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-dm",
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Vidyamitra — a calmer way to keep up with class",
    template: "%s · Vidyamitra",
  },
  description:
    "A practice companion for Class 8 students. Vidyamitra paces revision to how you're actually doing, and notices when the pressure is getting heavy.",
};

export const viewport: Viewport = {
  themeColor: "#eef1ee",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable} ${dmSans.variable} ${cormorant.variable}`}>
      {/* Browser extensions (e.g. Grammarly) inject attributes onto <body> before
          hydration; suppress the attribute warning for this element only. */}
      <body suppressHydrationWarning className="min-h-dvh font-body antialiased">
        <div className="aurora" aria-hidden="true" />
        <div className="starfield" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
