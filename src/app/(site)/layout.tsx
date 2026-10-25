import "@/styles/fx.css";
import Footer from "@/components/Footer";
import MobileCta from "@/components/MobileCta";
import Nav from "@/components/Nav";

// Pages du site : nav + footer. Les pages de connexion (groupe (auth)) ont leur propre layout, sans nav ni footer.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="public-sans flex min-h-full flex-1 flex-col">
      <Nav />
      <main id="contenu" className="flex-1">{children}</main>
      <Footer />
      <MobileCta />
      <div aria-hidden="true" className="h-20 sm:hidden" />
    </div>
  );
}
