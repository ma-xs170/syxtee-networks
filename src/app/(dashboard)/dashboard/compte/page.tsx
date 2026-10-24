import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AvatarForm, DeleteAccountForm, EmailForm, NamesForm, PasswordForm } from "@/components/auth/AccountForms";
import ChatAccounts from "@/components/auth/ChatAccounts";
import ProfileForm from "@/components/auth/ProfileForm";
import { ConsentToggle, EraseCoverage, PrivateZones, type PrivateZone } from "@/components/dashboard/CoverageSettings";
import LinkDevices from "@/components/dashboard/LinkDevices";
import PlanPicker from "@/components/dashboard/PlanPicker";
import LowDataToggle from "@/components/dashboard/LowDataToggle";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { Column, DkTabs, ListRow, Section, StatusBadge } from "@/components/dashboard/kit";
import { ApiKeys, Webhooks, type HookRow, type KeyRow } from "@/components/dashboard/DevTools";
import { ToastProvider } from "@/components/ui/Toast";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { authErrorMessage } from "@/lib/auth/errors";
import { getPlan } from "@/lib/auth/plan";
import { canSubscribe } from "@/lib/billing";
import { publicCoreUrl } from "@/lib/core";
import { LOW_DATA_COOKIE } from "@/lib/low-data";
import { FEATURES } from "@/lib/plans";
import { initials } from "@/lib/names";
import { createAdminClient } from "@/lib/supabase/admin";
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
  { id: "developpeurs", label: "Développeurs" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default async function ComptePage({ searchParams }: PageProps<"/dashboard/compte">) {
  const sp = await searchParams;
  const raw = typeof sp.onglet === "string" ? sp.onglet : "";
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "profil";
  await requireUser(`/dashboard/compte?onglet=${tab}`);
  return (
    <ToastProvider>
      <Column max={720}>
        <header className="mb-10">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Réglages</p>
          <h1 className="text-[clamp(2.5rem,6vw,3.75rem)] font-semibold leading-none tracking-[-0.04em]">Compte</h1>
        </header>
        <div className="mb-8">
          <DkTabs label="Compte" current={`/dashboard/compte?onglet=${tab}`} tabs={TABS.map((t) => ({ label: t.label, href: `/dashboard/compte?onglet=${t.id}` }))} />
        </div>
        {tab === "profil" && <Profil confirmed={sp.email === "ok"} />}
        {tab === "securite" && <Securite />}
        {tab === "plateformes" && <Plateformes erreur={typeof sp.erreur === "string" ? sp.erreur : null} />}
        {tab === "formule" && <Formule />}
        {tab === "equipe" && <EquipeTab />}
        {tab === "preferences" && <Preferences />}
        {tab === "developpeurs" && <Developpeurs />}
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
      <Section title="Mot de passe">
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
  const profile = await getProfile();
  const paying = plan.id !== "free";
  const subscribed = plan.id === "basic" || plan.id === "paid" || plan.id === "extra";
  const lim = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);
  const included = [lim(plan.maxRelays, "serveur", "serveurs"), lim(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];
  return (
    <>
      <Section title="Formule actuelle">
        <ListRow title={<span className="text-[22px] font-semibold tracking-[-0.02em]">{plan.name}</span>} trailing={<StatusBadge tone={paying ? "ok" : "neutral"}>{paying ? "Active" : "Aucune formule"}</StatusBadge>} />
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-[14px] text-muted sm:grid-cols-2">
          {included.map((i) => <li key={i}>{i}</li>)}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          {subscribed && <ManageButton />}
          {profile && canSubscribe(profile) && <a href="#formules" className="dk-btn dk-btn-secondary">Voir les formules</a>}
        </div>
        {subscribed && <p className="mt-3 text-[13px] text-muted">Moyen de paiement, factures et résiliation : dans le portail, via « Gérer l&apos;abonnement ».</p>}
      </Section>
      {profile && canSubscribe(profile) && (
        <div id="formules" className="scroll-mt-24">
          <Section title="Choisir une formule" text="Paiement sécurisé par Stripe. Sans engagement : tu peux annuler quand tu veux.">
            <PlanPicker />
          </Section>
        </div>
      )}
      <Section title="Limites de ta formule">
        <UsageTab embedded />
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

async function Developpeurs() {
  const user = await requireUser("/dashboard/compte");
  const db = createAdminClient();
  const [{ data: keys }, { data: hooks }] = await Promise.all([
    db.from("api_keys").select("id, name, prefix, created_at, last_used_at").eq("user_id", user.id).is("revoked_at", null).order("created_at", { ascending: false }),
    db.from("webhooks").select("id, url, secret, active, last_at, last_status").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <Section title="Clés d'API" text="Lecture seule, 60 requêtes par minute. Envoie la clé dans l'en-tête Authorization: Bearer sx_… ">
        <ApiKeys keys={(keys ?? []) as KeyRow[]} />
        <pre className="dk-mono mt-6 overflow-x-auto rounded-[10px] border border-line p-4 text-[13px] text-muted">{`curl https://www.syxtee-networks.fr/api/v1/lives?limit=5 \\
  -H "Authorization: Bearer sx_…"`}</pre>
        <p className="mt-2 text-[13px] text-muted">Routes : <span className="dk-mono">GET /api/v1/me</span>, <span className="dk-mono">GET /api/v1/lives</span>.</p>
      </Section>
      <Section title="Webhooks" text="Un POST JSON signé part à chaque début (live.started) et fin (live.ended) de direct. https obligatoire.">
        <Webhooks hooks={(hooks ?? []) as HookRow[]} />
        <p className="mt-6 text-[13px] leading-relaxed text-muted">
          Signature : en-tête <span className="dk-mono">X-Syxtee-Signature: t=…,v1=…</span>, où v1 est le HMAC-SHA256 hexadécimal de « t.corps » avec le secret du webhook. Rejette les requêtes dont t a plus de 5 minutes.
        </p>
      </Section>
    </>
  );
}
