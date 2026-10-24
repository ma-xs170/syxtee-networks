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
import { Column, DkTabs, ListRow, Panel, StatusBadge } from "@/components/dashboard/kit";
import { ApiKeys, Webhooks, type HookRow, type KeyRow } from "@/components/dashboard/DevTools";
import { ToastProvider } from "@/components/ui/Toast";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { authErrorMessage } from "@/lib/auth/errors";
import { getPlan } from "@/lib/auth/plan";
import { canSubscribe, CATALOG, isProdTier, PRODUCTION, type Tier } from "@/lib/billing";
import { hasProductionPrices } from "@/lib/stripe";
import { publicCoreUrl } from "@/lib/core";
import { LOW_DATA_COOKIE } from "@/lib/low-data";
import { FEATURES } from "@/lib/plans";
import { initials, shortName } from "@/lib/names";
import Image from "next/image";
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
      <Column>
        <header className="mb-8">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Réglages</p>
          <h1 className="text-[clamp(2.5rem,6vw,3.75rem)] font-semibold leading-none tracking-[-0.04em]">Compte</h1>
        </header>
        <div className="dk-account">
          <nav aria-label="Compte" className="dk-side">
            {TABS.map((t) => (
              <Link key={t.id} href={`/dashboard/compte?onglet=${t.id}`} aria-current={t.id === tab ? "page" : undefined}>{t.label}</Link>
            ))}
          </nav>
          <div className="dk-mobile-tabs">
            <DkTabs label="Compte" current={`/dashboard/compte?onglet=${tab}`} tabs={TABS.map((t) => ({ label: t.label, href: `/dashboard/compte?onglet=${t.id}` }))} />
          </div>
          <div className="min-w-0 max-w-[720px]">
            {tab === "profil" && <Profil confirmed={sp.email === "ok"} />}
            {tab === "securite" && <Securite />}
            {tab === "plateformes" && <Plateformes erreur={typeof sp.erreur === "string" ? sp.erreur : null} />}
            {tab === "formule" && <Formule />}
            {tab === "equipe" && <EquipeTab />}
            {tab === "preferences" && <Preferences />}
            {tab === "developpeurs" && <Developpeurs />}
          </div>
        </div>
      </Column>
    </ToastProvider>
  );
}

async function Profil({ confirmed }: { confirmed: boolean }) {
  const [user, profile, plan] = await Promise.all([requireUser("/dashboard/compte?onglet=profil"), getProfile(), getPlan()]);
  const p = profile!;
  const since = user.created_at ? new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(user.created_at)) : null;
  return (
    <>
      {confirmed && <p role="status" className="mb-4 text-[14px] text-muted">Adresse confirmée. Si tu as aussi cliqué le lien reçu sur l&apos;autre adresse, ton e-mail est changé.</p>}
      <div className="dk-panel flex flex-wrap items-center gap-5">
        {p.avatar_url ? (
          <Image src={p.avatar_url} alt="" width={72} height={72} className="h-[72px] w-[72px] rounded-full object-cover" />
        ) : (
          <span aria-hidden="true" className="grid h-[72px] w-[72px] place-items-center rounded-full bg-foreground/10 text-[24px] font-semibold">{initials(p)}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] font-semibold tracking-[-0.02em]">{shortName(p, user.email ?? "Ton compte")}</p>
          <p className="truncate text-[14px] text-muted">{user.email}</p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            <StatusBadge tone={plan.id === "free" ? "neutral" : "ok"}>{plan.name}</StatusBadge>
            {since && <span>Membre depuis {since}</span>}
          </p>
        </div>
        <Link href="/dashboard/compte?onglet=formule" className="dk-btn dk-btn-secondary">Formule</Link>
      </div>
      <div className="mt-4" />
      <Panel title="Identité" text="Ta photo apparaît dans le dashboard et, si tu l'autorises, sur l'accueil du site.">
        <div className="grid gap-8">
          <AvatarForm url={p.avatar_url} initials={initials(p)} />
          <NamesForm first={p.first_name ?? ""} last={p.last_name ?? ""} />
          <EmailForm current={user.email ?? ""} />
        </div>
      </Panel>
      <Panel title="Région, bio et réseaux" text="Ta région règle l'heure et le bonjour du dashboard ; le reste est ce que tu montres sur le site.">
        <ProfileForm profile={p} mode="compte" next="/dashboard/compte?onglet=profil" />
      </Panel>
      <Panel title="Supprimer mon compte" text="Supprime ton compte, tes relais et tes données. Cette action est définitive." danger>
        <DeleteAccountForm />
      </Panel>
    </>
  );
}

async function Securite() {
  const user = await requireUser("/dashboard/compte");
  return (
    <>
      <Panel title="Mot de passe">
        <PasswordForm email={user.email ?? ""} />
      </Panel>
      <Panel title="Postes reliés" text="Les ordinateurs reliés à ton compte avec SYXTEE Link. Révoquer un poste coupe sa connexion tout de suite.">
        <LinkDevices coreUrl={publicCoreUrl} />
      </Panel>
    </>
  );
}

function Plateformes({ erreur }: { erreur: string | null }) {
  const error = authErrorMessage(erreur);
  return (
    <Panel title="Plateformes connectées" text="Relie Twitch, Kick et YouTube pour lire et écrire dans ton Multichat. Rien à saisir : ta chaîne est reprise du compte relié.">
      {error && <p role="alert" className="mb-4 text-[14px]" style={{ color: "var(--dk-red)" }}>{error}</p>}
      <ChatAccounts />
    </Panel>
  );
}

async function Formule() {
  const plan = await getPlan();
  const profile = await getProfile();
  const paying = plan.id !== "free";
  const subscribed = plan.id === "basic" || plan.id === "paid" || plan.id === "extra" || isProdTier(plan.id);
  const lim = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n > 1 ? many : one}` : `${many} illimités`);
  const included = [lim(plan.maxRelays, "serveur", "serveurs"), lim(plan.maxConcurrentStreams, "flux simultané", "flux simultanés"), ...plan.features.map((f) => FEATURES[f])];
  const fmt = (v: string | null | undefined) => (v ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(v)) : null);
  const end = fmt(profile?.billing_period_end ?? profile?.plan_until);
  const priceOf = (i: "month" | "year") => (isProdTier(plan.id) ? PRODUCTION[plan.id].prices[i] : CATALOG[plan.id as Tier].prices[i]);
  const price = subscribed ? priceOf(profile?.billing_interval === "year" ? "year" : "month") : null;
  const renewal = !end ? null : profile?.cancel_at_period_end ? `Se termine le ${end}, sans renouvellement.` : subscribed ? `Prochain renouvellement le ${end}.` : `Valable jusqu'au ${end}.`;
  return (
    <>
      <div className="dk-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted">Formule actuelle</p>
            <p className="mt-1 text-[34px] font-semibold leading-none tracking-[-0.03em]">{plan.name}</p>
            {price && <p className="mt-2 text-[14px] text-muted">{price.amount} {profile?.billing_interval === "year" ? "par an" : "par mois"}</p>}
          </div>
          <StatusBadge tone={paying ? "ok" : "neutral"}>{paying ? "Active" : "Aucune formule"}</StatusBadge>
        </div>
        {renewal && <p className="mt-3 text-[14px] text-muted">{renewal}</p>}
        <ul className="mt-5 grid gap-x-8 gap-y-1.5 text-[14px] sm:grid-cols-2">
          {included.map((i) => <li key={i} className="text-muted">{i}</li>)}
        </ul>
        {subscribed && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <ManageButton />
            <span className="text-[13px] text-muted">Moyen de paiement, factures et résiliation.</span>
          </div>
        )}
      </div>
      {profile && canSubscribe(profile) && (
        <div className="mt-4" id="formules">
          <Panel title={subscribed ? "Changer de formule" : "Choisir une formule"} text="Paiement sécurisé par Stripe. Sans engagement : tu peux annuler quand tu veux.">
            <PlanPicker current={subscribed ? (plan.id as Tier) : null} production={hasProductionPrices} />
          </Panel>
        </div>
      )}
      <div className="mt-4">
        <Panel title="Limites de ta formule">
          <UsageTab embedded />
        </Panel>
      </div>
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
      <Panel title="Mode stream" text="Floute clés, URLs et e-mail pour montrer ton dashboard en live. Le réglage reste actif sur ce navigateur.">
        <StreamModeToggle withLabel />
      </Panel>
      <Panel title="Connexion basse" text="Pour une mauvaise connexion mobile : le dashboard se réduit à une page de texte avec tes relais actifs.">
        <LowDataToggle initial={jar.get(LOW_DATA_COOKIE)?.value === "1"} />
      </Panel>
      <Panel title="Carte de couverture" id="couverture">
        <ConsentToggle initial={profile?.coverage_consent === true} />
        <div className="mt-6"><EraseCoverage /></div>
      </Panel>
      <Panel title="Zones privées" text="Jusqu'à 3 cercles (domicile, travail) où aucune mesure n'est jamais enregistrée.">
        <PrivateZones zones={(zones ?? []) as PrivateZone[]} />
      </Panel>
      <Panel title="Autres">
        <ul>
          <ListRow href="/dashboard/parametres/alertes" title="Alertes Discord" />
          <ListRow href="/dashboard/videaste" title="Ma fiche vidéaste" />
          <ListRow href="/dashboard/parametres/documents" title="Documents" />
          <ListRow href="/dashboard/parametres/labs" title="Labs" />
        </ul>
      </Panel>
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
      <Panel title="Clés d'API" text="Lecture seule, 60 requêtes par minute. Envoie la clé dans l'en-tête Authorization: Bearer sx_… ">
        <ApiKeys keys={(keys ?? []) as KeyRow[]} />
        <pre className="dk-mono mt-6 overflow-x-auto rounded-[10px] border border-line p-4 text-[13px] text-muted">{`curl https://www.syxtee-networks.fr/api/v1/lives?limit=5 \\
  -H "Authorization: Bearer sx_…"`}</pre>
        <p className="mt-2 text-[13px] text-muted">Routes : <span className="dk-mono">GET /api/v1/me</span>, <span className="dk-mono">GET /api/v1/lives</span>.</p>
      </Panel>
      <Panel title="Webhooks" text="Un POST JSON signé part à chaque début (live.started) et fin (live.ended) de direct. https obligatoire.">
        <Webhooks hooks={(hooks ?? []) as HookRow[]} />
        <p className="mt-6 text-[13px] leading-relaxed text-muted">
          Signature : en-tête <span className="dk-mono">X-Syxtee-Signature: t=…,v1=…</span>, où v1 est le HMAC-SHA256 hexadécimal de « t.corps » avec le secret du webhook. Rejette les requêtes dont t a plus de 5 minutes.
        </p>
      </Panel>
    </>
  );
}
