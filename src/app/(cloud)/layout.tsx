import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import CloudTabs from "@/components/cloud/CloudTabs";
import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { supabaseUrl } from "@/lib/supabase/env";
import { getActiveWorkspace } from "@/lib/workspace";

// Cloud : une page à part (cloud.syxtee-networks.fr), sans barre latérale. Barre du haut : retour à l'espace client, espace actif, onglets.
// Même session que le dashboard (cookie partagé entre les sous-domaines) ; le Core revérifie chaque appel.
export default async function StatsLayout({ children }: LayoutProps<"/">) {
  if (publicCoreUrl) preconnect(publicCoreUrl, { crossOrigin: "anonymous" });
  if (supabaseUrl) preconnect(supabaseUrl, { crossOrigin: "anonymous" });
  await requireUser("/dashboard/cloud");
  const [profile, workspace] = await Promise.all([getProfile(), getActiveWorkspace()]);
  if (!profile?.onboarded_at) redirect("/bienvenue");

  return (
    <div className="dash-surface flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-background/95">
        <div className="flex h-14 w-full items-center gap-4 px-4">
          <Link href="/dashboard/cloud" className="flex shrink-0 items-center gap-3" aria-label="SYXTEE Cloud : tous les flux">
            <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
            <span className="hidden text-sm font-semibold tracking-[0.18em] sm:inline">SYXTEE</span>
          </Link>
          <span className="hidden font-mono text-xs text-muted sm:inline" aria-hidden="true">/</span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.14em] text-muted sm:inline">Cloud</span>
          <Link href="/dashboard/cloud" className="ml-2 hidden shrink-0 whitespace-nowrap md:inline-block rounded-full bg-accent px-3.5 py-1.5 text-sm text-on-accent transition-opacity hover:opacity-90">Tous les flux</Link>

          <Suspense fallback={<span className="ml-auto" />}>
            <CloudTabs />
          </Suspense>

          <div className="hidden shrink-0 items-center gap-3 border-l border-line pl-4 md:flex">
            <a href="/dashboard" className="flex items-center gap-1.5 whitespace-nowrap font-mono text-xs text-muted transition-colors hover:text-foreground" title="Ouvrir le tableau de bord">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
              <span className="truncate">{workspace?.name ?? "Tableau de bord"}</span>
            </a>
          </div>
        </div>
      </header>
      <main id="contenu" className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
