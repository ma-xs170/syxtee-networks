import Image from "next/image";
import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { supabaseUrl } from "@/lib/supabase/env";
import { getActiveWorkspace } from "@/lib/workspace";

// Statistiques : une page à part (stats.syxtee-networks.fr), sans barre latérale. Barre du haut : retour à l'espace client, espace actif, onglets.
// Même session que le dashboard (cookie partagé entre les sous-domaines) ; le Core revérifie chaque appel.
export default async function StatsLayout({ children }: LayoutProps<"/">) {
  if (publicCoreUrl) preconnect(publicCoreUrl, { crossOrigin: "anonymous" });
  if (supabaseUrl) preconnect(supabaseUrl, { crossOrigin: "anonymous" });
  await requireUser("/dashboard/statistiques");
  const [profile, workspace] = await Promise.all([getProfile(), getActiveWorkspace()]);
  if (!profile?.onboarded_at) redirect("/bienvenue");

  const tab = "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors";
  return (
    <div className="dash-surface flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-[1680px] items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a href="/dashboard" className="flex shrink-0 items-center gap-3" aria-label="Retour à l'espace client SYXTEE">
            <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
            <span className="hidden text-sm font-semibold tracking-[0.18em] sm:inline">SYXTEE</span>
          </a>
          <span className="hidden font-mono text-xs text-muted sm:inline" aria-hidden="true">/</span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.14em] text-muted sm:inline">Statistiques</span>

          <nav aria-label="Statistiques" className="ml-auto flex items-center gap-1 overflow-x-auto">
            <span aria-current="page" className={`${tab} bg-accent text-on-accent`}>Statistiques</span>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- autre hôte (app) : navigation complète */}
            <a href="/dashboard/lives" className={`${tab} text-muted hover:text-foreground`}>Historique</a>
          </nav>

          <div className="hidden shrink-0 items-center gap-3 border-l border-line pl-4 md:flex">
            <span className="max-w-[16ch] truncate font-mono text-xs text-muted" title="Espace actif">{workspace?.name ?? "Personnel"}</span>
            <a href="/dashboard" className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-foreground/30 hover:text-foreground">Tableau de bord</a>
          </div>
        </div>
      </header>
      <main id="contenu" className="mx-auto w-full max-w-[1680px] flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-8">{children}</main>
      <footer className="border-t border-line">
        <p className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center justify-between gap-2 px-4 py-4 font-mono text-[11px] text-muted sm:px-6 lg:px-8">
          <span>Mesures du Core, relevées toutes les 2 secondes</span>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- autre hôte (app) : navigation complète */}
          <a href="/dashboard/aide" className="transition-colors hover:text-foreground">Support</a>
        </p>
      </footer>
    </div>
  );
}
