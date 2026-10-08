import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { site } from "@/lib/site";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import PwaRegister from "@/components/pwa/PwaRegister";
import GrainOverlay from "@/components/ui/GrainOverlay";


// Trois familles : Instrument Serif (titres), Geist Sans (interface et texte), Geist Mono (code, valeurs, petits labels).
const serif = Instrument_Serif({ subsets: ["latin", "latin-ext"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

// Icône d'onglet sans fond, assortie à l'onglet (logo noir sur barre claire, blanc sur barre sombre).
// Écran d'accueil iPhone : apple-touch-icon opaque (iOS refuse la transparence) et mode application plein écran.
const icons: Metadata["icons"] = {
  icon: [
    { url: "/icons/tab-light.png", type: "image/png", sizes: "256x256", media: "(prefers-color-scheme: light)" },
    { url: "/icons/tab-dark.png", type: "image/png", sizes: "256x256", media: "(prefers-color-scheme: dark)" },
  ],
  apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
};

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  icons,
  appleWebApp: { capable: true, title: "SYXTEE", statusBarStyle: "black" },
  applicationName: "SYXTEE",
  formatDetection: { telephone: false },
  title: {
    default: `${site.name} · Le direct en mobilité, sans compromis`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: ["contrôle à distance OBS", "multistream", "IRL", "streaming", "Twitch", "Kick", "YouTube", "Instagram", "bonding 4G"],
  openGraph: {
    title: `${site.name} · Le direct en mobilité, sans compromis`,
    description: site.description,
    url: site.url,
    siteName: site.name,
    locale: "fr_FR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <GrainOverlay />
        <PwaRegister />
      </body>
    </html>
  );
}
