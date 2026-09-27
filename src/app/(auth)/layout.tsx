import Link from "next/link";
import Drape from "@/components/auth/Drape";

// Pages de connexion : pas de nav ni de footer, fond noir avec drapés lumineux, contenu centré.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-black">
      <Drape />
      <header className="relative z-10 px-5 pt-5 sm:px-8 sm:pt-7">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/80 transition-colors hover:text-white">
          <span aria-hidden="true">‹</span> Accueil
        </Link>
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 sm:py-16">{children}</main>
    </div>
  );
}
