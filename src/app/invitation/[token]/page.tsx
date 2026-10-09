import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RemoteObs from "@/components/remote/RemoteObs";
import { getUser } from "@/lib/auth/dal";
import { listInvites, publicCoreUrl } from "@/lib/core";
import { switchInviteAccountAction } from "./actions";

// Lien d'invitation au contrôle à distance. Il faut un compte : l'invitation est liée à l'adresse email invitée. Sans compte (ou avec une autre
// adresse), la page propose de créer un compte ou de se connecter avec la bonne adresse. Les anciens liens (sans `o` ni `i`) s'ouvrent comme avant.
// Le secret est dans l'adresse : page jamais indexée, et aucun en-tête « referrer » n'est envoyé vers d'autres sites.
export const metadata: Metadata = { title: "Contrôle à distance", robots: { index: false, follow: false }, referrer: "no-referrer" };

const UUID = /^[0-9a-f-]{36}$/i;
const btn = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-7 text-base font-medium transition-colors";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 py-16">
      <div className="w-full tile p-7 text-center">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export default async function InvitationPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ o?: string; i?: string }> }) {
  const [{ token }, { o, i }] = await Promise.all([params, searchParams]);
  if (!/^sli_[0-9a-f]{48}$/.test(token)) notFound();
  if (!o || !i) return <RemoteObs coreUrl={publicCoreUrl} deviceId="" invite={token} />;
  if (!UUID.test(o) || !UUID.test(i)) notFound();

  const [invites, user] = await Promise.all([listInvites(o).catch(() => null), getUser()]);
  const inv = invites?.find((x) => x.id === i && !x.expired);
  if (!inv) {
    return (
      <Shell title="Invitation introuvable">
        <p className="mt-2 text-sm leading-relaxed text-muted">Ce lien a expiré, a été retiré, ou le service ne répond pas pour le moment. Demande une nouvelle invitation à la personne qui t&apos;a écrit.</p>
      </Shell>
    );
  }
  // Anciennes invitations sans adresse : ouvertes comme avant.
  if (!inv.email) return <RemoteObs coreUrl={publicCoreUrl} deviceId="" invite={token} />;

  const next = encodeURIComponent(`/invitation/${token}?o=${o}&i=${i}`);
  const mail = encodeURIComponent(inv.email);
  if (!user) {
    return (
      <Shell title="Un compte est nécessaire">
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tu es invité à piloter un OBS à distance. Crée un compte ou connecte-toi avec <strong data-sensitive className="text-foreground">{inv.email}</strong> : l&apos;invitation est liée à cette adresse.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link href={`/inscription?email=${mail}&next=${next}`} className={`${btn} btn-tonal`}>Créer mon compte</Link>
          <Link href={`/connexion?email=${mail}&next=${next}`} className={`${btn} border border-line-strong hover:bg-foreground/10`}>J&apos;ai déjà un compte</Link>
        </div>
      </Shell>
    );
  }
  if (user.email?.toLowerCase() !== inv.email.toLowerCase()) {
    return (
      <Shell title="Mauvais compte">
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Cette invitation est pour <strong data-sensitive className="text-foreground">{inv.email}</strong>. Tu es connecté avec <strong data-sensitive className="text-foreground">{user.email}</strong>. Connecte-toi avec l&apos;adresse invitée.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <form action={switchInviteAccountAction.bind(null, `/invitation/${token}?o=${o}&i=${i}`, inv.email)}>
            <button type="submit" className={`${btn} btn-tonal w-full`}>Changer de compte</button>
          </form>
        </div>
      </Shell>
    );
  }
  return <RemoteObs coreUrl={publicCoreUrl} deviceId="" invite={token} />;
}
