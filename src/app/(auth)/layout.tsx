import Link from "next/link";
import GridBackground from "@/components/ui/GridBackground";

// Pages de connexion : pas de nav ni de footer. Fond noir avec lignes de grille qui s'estompent et halo discret, contenu centré.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <GridBackground />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(ellipse_50%_60%_at_50%_0%,color-mix(in_srgb,var(--foreground)_9%,transparent),transparent_70%)]" />
      <header className="relative z-10 px-5 pt-5 sm:px-8 sm:pt-7">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground">
          <span aria-hidden="true">‹</span> Accueil
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 sm:py-16">{children}</main>
    </div>
  );
}
