import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AvatarForm, DeleteAccountForm, EmailForm, NamesForm, PasswordForm } from "@/components/auth/AccountForms";
import ChatAccounts from "@/components/auth/ChatAccounts";
import ProfileForm from "@/components/auth/ProfileForm";
import { ConsentToggle, EraseCoverage, PrivateZones, type PrivateZone } from "@/components/dashboard/CoverageSettings";
import LinkDevices from "@/components/dashboard/LinkDevices";
import LowDataToggle from "@/components/dashboard/LowDataToggle";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { Column, DkTabs, ListRow, PageTitle, Section, StatusBadge } from "@/components/dashboard/kit";
import ThemeToggle from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ui/Toast";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { authErrorMessage } from "@/lib/auth/errors";
import { getPlan } from "@/lib/auth/plan";
import { publicCoreUrl } from "@/lib/core";
import { LOW_DATA_COOKIE } from "@/lib/low-data";
import { FEATURES } from "@/lib/plans";
import { initials } from "@/lib/names";
import { createClient } from "@/lib/supabase/server";
import ManageButton from "../parametres/facturation/ManageButton";
import EquipeTab from "../parametres/equipe/page";
import UsageTab from "../parametres/usage/page";

export const metadata: Metadata = { title: "Compte", robots: { index: false } };

// Compte : une colonne de 720 px, un onglet par thème (?onglet=…), des sections séparées par un trait fin.
// Les actions dangereuses sont en rouge, en bas de leur section, avec confirmation.
const TABS = [
  { id: "profil", label: "Profil" },
  { id: "securite", label: "Sécurité" },
  { id: "plateformes", label: "Plateformes" },
  { id: "formule", label: "Formule et facturation" },
  { id: "equipe", label: "Équipe et accès" },
  { id: "preferences", label: "Préférences" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function ComptePage({ searchParams }: PageProps<"/dashboard/compte">) {
  const sp = await searchParams;
  const raw = typeof sp.onglet === "string" ? sp.onglet : "";
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "profil";
  await requireUser("/dashboard/compte");
  return (
    <ToastProvider>
      <Column max={720}>
        <PageTitle title="Compte" />
        <div className="mb-8">
          <DkTabs label="Compte" current={`/dashboard/compte?onglet=${tab}`} tabs={TABS.map((t) => ({ label: t.label, href: `/dashboard/compte?onglet=${t.id}` }))} />
        </div>
        {tab === "profil" && <Profil confirmed={sp.email === "ok"} />}
        {tab === "securite" && <Securite />}
        {tab === "plateformes" && <Plateformes erreur={typeof sp.erreur === "string" ? sp.erreur : null} />}
        {tab === "formule" && <Formule />}
        {tab === "equipe" && <EquipeTab />}
        {tab === "preferences" && <Preferences />}
      </Column>
    </ToastProvider>
  );
}

async function Profil({ confirmed }: { confirmed: boolean }) {
  const [user, profile] = await Promise.all([requireUser("/dashboard/compte"), getProfile()]);
  const p = profile!;
  return (
    <>
      {confirmed && <p role="status" className="mb-6 text-[14px] text-muted">Adresse confirmée. Si tu as aussi cliqué le lien reçu sur l&apos;autre adresse, ton e-mail est changé.</p>}
      <Section title="Photo" text="Elle apparaît dans le dashboard et, si tu l'autorises, sur l'accueil du site.">
        <AvatarForm url={p.avatar_url} initials={initials(p)} />
      </Section>
      <Section title="Nom">
        <NamesForm first={p.first_name ?? ""} last={p.last_name ?? ""} />
      </Section>
      <Section title="E-mail">
        <EmailForm current={user.email ?? ""} />
      </Section>
      <Section title="Région, bio et réseaux" text="Ta région règle l'heure et le bonjour du dashboard ; le reste est ce que tu montres sur le site.">
        <ProfileForm profile={p} mode="compte" next="/dashboard/compte?onglet=profil" />
      </Section>
      <Section title="Supprimer mon compte" text="Supprime ton compte, tes relais et tes données. Cette action est définitive." danger>
        <DeleteAccountForm />
      </Section>
    </>
  );
}

async function Securite() {
  const user = await requireUser("/dashboard/compte");
  return (
    <>
      <Section title="Mot de passe" text="Compte créé avec Google, Twitch ou Discord ? Il n'a pas de mot de passe : utilise « Mot de passe oublié » à la connexion pour en définir un.">
        <PasswordForm email={user.email ?? ""} />
      </Section>
      <Section title="Postes reliés" text="Les ordinateurs reliés à ton compte avec SYXTEE Link. Révoquer un poste coupe sa connexion tout de suite.">
        <LinkDevices coreUrl={publicCoreUrl} />
      </Section>
    </>
  );
}

function Plateformes({ erreur }: { erreur: string | null }) {
  const error = authErrorMessage(erreur);
  return (
    <Section title="Plateformes connectées" text="Relie Twitch, Kick et YouTube pour lire et écrire dans ton Multichat. Rien à saisir : ta chaîne est reprise du compte relié.">
      {error && <p role="alert" className="mb-4 text-[14px]" style={{ color: "var(--dk-red)" }}>{error}</p>}
      <ChatAccounts />
    </Section>
  );
}

async function Formule() {
  const plan = await getPlan();
  const lim = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);
  const included = [lim(plan.maxRelays, "serveur", "serveurs"), lim(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];
  return (
    <>
      <Section title="Formule actuelle">
        <ListRow title={<span className="text-[20px]">{plan.name}</span>} trailing={<StatusBadge tone="ok">Active</StatusBadge>} />
        <ul className="mt-2 grid gap-1 text-[14px] text-muted sm:grid-cols-2">
          {included.map((i) => <li key={i}>{i}</li>)}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <ManageButton />
          <Link href="/tarifs" className="dk-btn dk-btn-secondary">Voir les formules</Link>
        </div>
      </Section>
      <Section title="Limites">
        <UsageTab />
      </Section>
      <Section title="Factures" text="Tes factures apparaîtront ici dès ton premier paiement.">
        <p className="text-[14px] text-muted">Aucune facture pour l&apos;instant.</p>
      </Section>
    </>
  );
}

async function Preferences() {
  const supabase = await createClient();
  const [, profile, jar, { data: zones }] = await Promise.all([
    requireUser("/dashboard/compte"),
    getProfile(),
    cookies(),
    supabase.from("private_zones").select("id, label, lat, lng, radius_m").order("created_at"),
  ]);
  return (
    <>
      <Section title="Thème" text="Auto suit le réglage de ton appareil.">
        <ThemeToggle />
      </Section>
      <Section title="Mode stream" text="Floute clés, URLs et e-mail pour montrer ton dashboard en live. Le réglage reste actif sur ce navigateur.">
        <StreamModeToggle withLabel />
      </Section>
      <Section title="Connexion basse" text="Pour une mauvaise connexion mobile : le dashboard se réduit à une page de texte avec tes relais actifs.">
        <LowDataToggle initial={jar.get(LOW_DATA_COOKIE)?.value === "1"} />
      </Section>
      <Section title="Carte de couverture" id="couverture">
        <ConsentToggle initial={profile?.coverage_consent === true} />
        <div className="mt-6"><EraseCoverage /></div>
      </Section>
      <Section title="Zones privées" text="Jusqu'à 3 cercles (domicile, travail) où aucune mesure n'est jamais enregistrée.">
        <PrivateZones zones={(zones ?? []) as PrivateZone[]} />
      </Section>
      <Section title="Autres">
        <ul>
          <ListRow href="/dashboard/parametres/documents" title="Documents" />
          <ListRow href="/dashboard/parametres/labs" title="Labs" />
        </ul>
      </Section>
    </>
  );
}
