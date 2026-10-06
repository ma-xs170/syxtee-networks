import Link from "next/link";
import CloudBackdrop from "@/components/home/CloudBackdrop";

// Pages de connexion : pas de nav ni de footer, mêmes nuages rouges que le site et le dashboard (teintés par le thème
// Auto / Sombre / Clair), contenu centré.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-background">
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 h-[44rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_40%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,#000_40%,transparent_100%)]">
        <CloudBackdrop tone="theme" />
      </div>
      <header className="relative z-10 px-5 pt-5 sm:px-8 sm:pt-7">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-foreground">
          <span aria-hidden="true">‹</span> Accueil
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 sm:py-16">{children}</main>
    </div>
  );
}
