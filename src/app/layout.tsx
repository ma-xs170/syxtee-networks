import type { Metadata, Viewport } from "next";
import { Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import PwaRegister from "@/components/pwa/PwaRegister";


// Charte noir et blanc : Figtree (textes et titres) et JetBrains Mono (libellés techniques).
const inter = Figtree({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jetbrains-mono", display: "swap" });

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
    default: `${site.name} - Relais IRL low-cost`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  keywords: ["IRL", "SRTLA", "relais SRT", "streaming", "Twitch", "Kick", "YouTube", "bonding 4G"],
  openGraph: {
    title: `${site.name} - Relais IRL low-cost`,
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
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
