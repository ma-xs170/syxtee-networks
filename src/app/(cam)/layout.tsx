import type { Metadata, Viewport } from "next";

// SYXTEE Cam : plein écran, sans nav ni footer, installable (PWA limitée à /cam).
export const metadata: Metadata = {
  title: "SYXTEE Cam",
  manifest: "/cam.webmanifest",
  appleWebApp: { capable: true, title: "SYXTEE Cam", statusBarStyle: "black-translucent" },
  robots: { index: false },
};

export const viewport: Viewport = { themeColor: "#000000", viewportFit: "cover", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function CamLayout({ children }: LayoutProps<"/">) {
  return <div data-theme="dark" className="fixed inset-0 bg-black">{children}</div>;
}
