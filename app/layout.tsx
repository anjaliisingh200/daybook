import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const ui = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});
const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Daybook",
  description: "Your calendar and tasks, in one calm place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

/** Applies the saved density, font size and accent before first paint, so there is no flash. Light only. */
const bootScript = `
try {
  var p = JSON.parse(localStorage.getItem('daybook.prefs') || '{}').state || {};
  var d = document.documentElement;
  d.dataset.theme = 'light';
  d.dataset.density = p.density || 'comfortable';
  d.dataset.fontsize = p.fontSize || 'medium';
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ui.variable} ${display.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
