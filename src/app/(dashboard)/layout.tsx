import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { preconnect } from "react-dom";
import { supabaseUrl } from "@/lib/supabase/env";
import { LOW_DATA_COOKIE, LOW_DATA_PAGE } from "@/lib/low-data";
import Heartbeat from "@/components/dashboard/Heartbeat";
import { LiveStatusProvider } from "@/components/dashboard/LiveStatus";
import NamesModal from "@/components/auth/NamesModal";
import DashboardShell from "@/components/dashboard/Sidebar";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { isAdminEmail } from "@/lib/admin";
import { publicCoreUrl } from "@/lib/core";
import { hasNames } from "@/lib/names";
import { TimezoneProvider } from "@/components/dashboard/Timezone";
import { accountTimezone } from "@/lib/regions";

// Dashboard : barre latérale (Sidebar.tsx), statut du direct partagé par toutes les pages.
// Pas de footer : l'ID support et le ticket Discord vivent sur la page Support.
export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  // Connexions TLS ouvertes d'avance vers le Core et Supabase : le premier appel du navigateur part sans attendre la poignée de main.
  if (publicCoreUrl) preconnect(publicCoreUrl, { crossOrigin: "anonymous" });
  if (supabaseUrl) preconnect(supabaseUrl, { crossOrigin: "anonymous" });
  const [user, profile] = await Promise.all([requireUser("/dashboard"), getProfile()]);
  if (!profile?.onboarded_at) redirect("/bienvenue");
  // Connexion basse : coque minimale (pas de menu, de fonds animés ni de statut en direct), la page se charge seule.
  if ((await cookies()).get(LOW_DATA_COOKIE)?.value === "1") {
    return (
      <div className="dash-surface min-h-dvh">
        <header className="flex h-12 items-center justify-between gap-3 border-b border-line px-4">
          <Link href={LOW_DATA_PAGE} className="text-sm font-semibold tracking-[0.18em]">SYXTEE</Link>
          <nav aria-label="Connexion basse" className="flex gap-4 text-sm text-muted">
            <Link href={LOW_DATA_PAGE} className="hover:text-foreground">Relais</Link>
            <Link href="/dashboard/parametres" className="hover:text-foreground">Paramètres</Link>
          </nav>
        </header>
        <Heartbeat />
        <main>{children}</main>
      </div>
    );
  }
  return (
    <LiveStatusProvider coreUrl={publicCoreUrl}>
      <TimezoneProvider timezone={accountTimezone(profile)}>
      <DashboardShell admin={isAdminEmail(user.email)}>
      {/* Prénom/nom manquants : modale hors live, bandeau pendant un live (en haut, sous la barre). */}
      {!hasNames(profile) && <NamesModal />}
      <Heartbeat />
      <main className="flex-1">{children}</main>
      </DashboardShell>
      </TimezoneProvider>
    </LiveStatusProvider>
  );
}
