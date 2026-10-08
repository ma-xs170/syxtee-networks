import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { getUser } from "@/lib/auth/dal";
import { PERMISSIONS, ROLE_META, roleStyle } from "@/lib/staff";
import { inviteByToken } from "@/lib/staff-data";
import { acceptInvitationAction, switchAccountAction } from "./actions";

export const metadata: Metadata = { title: "Invitation à l'équipe", robots: { index: false } };

const btn = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98]";

// Page ouverte depuis l'e-mail d'invitation de l'équipe. Hors de /admin : l'invité n'est pas encore membre (404 sinon).
export default async function InvitationPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ erreur?: string }> }) {
  const [{ token }, { erreur }] = await Promise.all([params, searchParams]);
  const [inv, user] = await Promise.all([inviteByToken(token), getUser()]);
  const next = encodeURIComponent(`/equipe/invitation/${token}`);

  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-xl">
        {!inv ? (
          <div className="text-center">
            <h1 className="h-section">Invitation introuvable.</h1>
            <p className="mt-4 text-muted">Ce lien est expiré, déjà utilisé ou retiré. Demande une nouvelle invitation à la personne qui t&apos;a écrit.</p>
          </div>
        ) : (
          <>
            <h1 className="h-section">Rejoins l&apos;équipe SYXTEE.</h1>
            <p className="mt-4 text-muted">
              {inv.inviter ?? "L'équipe"} t&apos;invite avec l&apos;adresse <strong data-sensitive className="text-foreground">{inv.email}</strong>.
            </p>

            <div className="mt-8 tile p-5 sm:p-6">
              <span style={roleStyle(inv.role)} className="inline-flex rounded-md border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-[0.1em]">
                {ROLE_META[inv.role].label}
              </span>
              <p className="mt-3 text-sm text-muted">{ROLE_META[inv.role].text}</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {inv.permissions.map((p) => (
                  <li key={p} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                    {PERMISSIONS[p].label}
                  </li>
                ))}
              </ul>
            </div>

            {erreur === "wrong_email" && (
              <p role="alert" className="mt-6 rounded-xl border border-red-400/30 px-4 py-3 text-sm text-red-300">
                Tu es connecté avec une autre adresse (ou ton adresse n&apos;est pas vérifiée). Connecte-toi avec {inv.email}.
              </p>
            )}
            {erreur === "invalid" && (
              <p role="alert" className="mt-6 rounded-xl border border-red-400/30 px-4 py-3 text-sm text-red-300">
                L&apos;invitation n&apos;a pas pu être acceptée. Réessaie ou demande un nouveau lien.
              </p>
            )}

            {user && user.email?.toLowerCase() !== inv.email.toLowerCase() && (
              <p role="status" className="mt-6 rounded-xl border border-line-strong bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
                Tu es connecté avec <strong data-sensitive className="text-foreground">{user.email}</strong>. Cette invitation est pour <strong data-sensitive className="text-foreground">{inv.email}</strong> : change de compte pour l&apos;accepter.
              </p>
            )}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {user && user.email?.toLowerCase() !== inv.email.toLowerCase() ? (
                <form action={switchAccountAction.bind(null, token, inv.email)}>
                  <button type="submit" className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
                    Changer de compte
                  </button>
                </form>
              ) : user && user.email?.toLowerCase() === inv.email.toLowerCase() ? (
                <form action={acceptInvitationAction.bind(null, token)}>
                  <button type="submit" className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
                    Accepter l&apos;invitation
                  </button>
                </form>
              ) : (
                <>
                  <Link href={`/connexion?next=${next}`} className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
                    Me connecter
                  </Link>
                  <Link href={`/inscription?email=${encodeURIComponent(inv.email)}&next=${next}`} className={`${btn} border border-line-strong hover:bg-foreground/10`}>
                    Créer mon compte
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-xs leading-relaxed text-muted">Après l&apos;acceptation, l&apos;espace équipe te demande d&apos;activer la double authentification (une application de codes).</p>
          </>
        )}
      </Container>
    </section>
  );
}
