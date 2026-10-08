import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { DeleteAccountForm, EmailForm, NamesForm, PasswordForm } from "@/components/auth/AccountForms";
import { ConsentToggle, EraseCoverage, PrivateZones, type PrivateZone } from "@/components/dashboard/CoverageSettings";
import { DiscordTicketButton, SupportId } from "@/components/SupportId";
import LowDataToggle from "@/components/dashboard/LowDataToggle";
import { cookies } from "next/headers";
import { LOW_DATA_COOKIE } from "@/lib/low-data";
import LinkDevices from "@/components/dashboard/LinkDevices";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { Tile, TileLabel } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Paramètres", robots: { index: false } };

export default async function ParametresPage({ searchParams }: PageProps<"/dashboard/parametres">) {
  const supabase = await createClient();
  const [user, { email: emailDone }, profile, jar, { data: zones }] = await Promise.all([
    requireUser("/dashboard/parametres"),
    searchParams,
    getProfile(),
    cookies(),
    supabase.from("private_zones").select("id, label, lat, lng, radius_m").order("created_at"),
  ]);
  const low = jar.get(LOW_DATA_COOKIE)?.value === "1";
  return (
    <>
      {emailDone === "ok" && (
        <p role="status" className="mb-4 rounded-xl border border-line px-4 py-3 text-sm text-muted">
          Adresse confirmée. Si tu as aussi cliqué le lien reçu sur l&apos;autre adresse, ton email est changé.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Tile className="lg:col-span-2">
          <TileLabel>Identité</TileLabel>
          <div className="mt-5 max-w-xl">
            <NamesForm first={profile?.first_name ?? ""} last={profile?.last_name ?? ""} />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Email</TileLabel>
          <div className="mt-5">
            <EmailForm current={user.email ?? ""} />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Mot de passe</TileLabel>
          <div className="mt-5">
            <PasswordForm email={user.email ?? ""} />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Mode stream</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">Floute clés, URLs et e-mail pour montrer ton dashboard en live. Le réglage reste actif sur ce navigateur.</p>
          <div className="mt-5">
            <StreamModeToggle withLabel />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Connexion basse</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">Pour une mauvaise connexion mobile : le dashboard se réduit à une page de texte avec tes relais actifs, leur débit et leur latence. Réglage gardé sur ce navigateur.</p>
          <div className="mt-5">
            <LowDataToggle initial={low} />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Session</TileLabel>
          <p className="mt-4 text-sm text-muted">
            Connecté avec <span data-sensitive className="text-foreground">{user.email}</span>
          </p>
          <form action={signOut} className="mt-5">
            <button type="submit" className="h-11 rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
              Déconnexion
            </button>
          </form>
        </Tile>
        <Tile id="appareils" className="lg:col-span-2">
          <TileLabel>Appareils</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">Les ordinateurs reliés à ton compte avec SYXTEE Link. Révoquer un poste coupe sa connexion tout de suite.</p>
          <LinkDevices coreUrl={publicCoreUrl} />
        </Tile>
        {profile?.support_id && (
          <Tile id="support" className="lg:col-span-2">
            <TileLabel>Support</TileLabel>
            <p className="mt-4 text-sm leading-relaxed text-muted">Le support se fait uniquement sur Discord. Donne cet ID dans ton ticket : on retrouve ton compte sans te demander ton e-mail.</p>
            <div className="mt-4">
              <SupportId id={profile.support_id} />
            </div>
            <div className="mt-5">
              <DiscordTicketButton id={profile.support_id} />
            </div>
          </Tile>
        )}
        <Tile id="couverture">
          <TileLabel>Carte de couverture</TileLabel>
          <div className="mt-4">
            <ConsentToggle initial={profile?.coverage_consent === true} />
          </div>
          <div className="mt-6 border-t border-line pt-4">
            <EraseCoverage />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Zones privées</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">Jusqu&apos;à 3 cercles (domicile, travail) où aucune mesure n&apos;est jamais enregistrée.</p>
          <div className="mt-5">
            <PrivateZones zones={(zones ?? []) as PrivateZone[]} />
          </div>
        </Tile>
        <Tile className="lg:col-span-2">
          <TileLabel>Supprimer mon compte</TileLabel>
          <div className="mt-4 max-w-xl">
            <DeleteAccountForm />
          </div>
        </Tile>
      </div>
    </>
  );
}
