import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { AvatarForm, DeleteAccountForm, EmailForm, NamesForm, PasswordForm } from "@/components/auth/AccountForms";
import ChatAccounts from "@/components/auth/ChatAccounts";
import ProfileForm from "@/components/auth/ProfileForm";
import { Container } from "@/components/ui";
import { initials } from "@/lib/names";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { authErrorMessage } from "@/lib/auth/errors";
import { getPlan } from "@/lib/auth/plan";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

// Mon compte : une carte par sujet, un menu d'ancres à gauche (en pastilles sur mobile).
const SECTIONS = [
  { id: "photo", label: "Photo" },
  { id: "identite", label: "Identité" },
  { id: "profil", label: "Profil public" },
  { id: "chat", label: "Comptes reliés" },
  { id: "connexion", label: "Connexion" },
  { id: "session", label: "Session" },
  { id: "danger", label: "Supprimer" },
] as const;

function Card({ id, title, text, children, danger = false }: { id: string; title: string; text?: string; children: ReactNode; danger?: boolean }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`scroll-mt-24 rounded-2xl border bg-surface p-5 sm:p-7 ${danger ? "border-red-400/30" : "border-line"}`}>
      <h2 id={`${id}-t`} className={`text-lg font-semibold tracking-tight ${danger ? "text-red-300" : ""}`}>
        {title}
      </h2>
      {text && <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-muted">{text}</p>}
      <div className="mt-6 max-w-xl">{children}</div>
    </section>
  );
}

export default async function ComptePage({ searchParams }: PageProps<"/compte">) {
  const user = await requireUser("/compte");
  const profile = await getProfile();
  if (!profile) redirect("/connexion?erreur=oauth");
  if (!profile.onboarded_at) redirect("/bienvenue?next=/compte");
  const plan = await getPlan();
  const { erreur } = await searchParams;
  const error = authErrorMessage(typeof erreur === "string" ? erreur : null);
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.twitch_display_name || "Mon compte";

  return (
    <Container className="py-12 sm:py-16">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full border border-line object-cover" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xl font-semibold uppercase text-muted">{initials(profile)}</span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
            <p data-sensitive className="mt-0.5 truncate text-sm text-muted">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/abonnement" className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground">
            Accès : {plan.name}
          </Link>
          <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
            Dashboard
          </Link>
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-xl border border-red-400/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <nav aria-label="Sections du compte" className="-mx-4 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:self-start lg:overflow-visible lg:px-0">
          <ul className="flex gap-2 lg:flex-col lg:gap-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="block whitespace-nowrap rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:text-foreground lg:rounded-lg lg:border-transparent lg:px-3 lg:py-2 lg:hover:bg-foreground/[0.06]">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          <Card id="photo" title="Photo de profil" text="Ton avatar apparaît dans le dashboard et, si tu l'autorises, sur l'accueil du site.">
            <AvatarForm url={profile.avatar_url} initials={initials(profile)} />
          </Card>

          <Card id="identite" title="Identité" text="Ton prénom et ton nom. Ils ne sont jamais affichés publiquement sans ton accord.">
            <NamesForm first={profile.first_name ?? ""} last={profile.last_name ?? ""} />
          </Card>

          <Card id="profil" title="Profil public" text="Ta région (heure et bonjour du dashboard), ta bio, tes réseaux et ce que tu montres sur l'accueil du site.">
            <ProfileForm profile={profile} mode="compte" />
          </Card>

          <Card id="chat" title="Comptes reliés" text="Relie YouTube, Twitch et Kick pour lire et écrire dans ton Multichat. Rien à saisir : ta chaîne est reprise du compte relié.">
            <ChatAccounts />
          </Card>

          <Card id="connexion" title="Connexion" text="Ton adresse email et ton mot de passe. Un lien de confirmation part vers l'ancienne et la nouvelle adresse.">
            <div className="space-y-8">
              <EmailForm current={user.email ?? ""} />
              <div className="border-t border-line pt-8">
                <PasswordForm email={user.email ?? ""} />
              </div>
            </div>
          </Card>

          <Card id="session" title="Session" text="Tu es connecté sur cet appareil.">
            <form action={signOut}>
              <button type="submit" className="h-11 rounded-xl border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
                Se déconnecter
              </button>
            </form>
          </Card>

          <Card id="danger" title="Supprimer mon compte" text="Supprime ton compte, tes relais et tes données. Cette action est définitive." danger>
            <DeleteAccountForm />
          </Card>
        </div>
      </div>
    </Container>
  );
}
