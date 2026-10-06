import type { Metadata } from "next";
import Link from "next/link";
import { Key, LockKey, PlugsConnected, ShareNetwork, Trash, UserCircle } from "@/components/icons";
import { listConnections } from "@/lib/chat/providers";
import { authErrorMessage } from "@/lib/auth/errors";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

// Vue d'ensemble : une carte par section, chacune mène à sa propre page, avec un résumé de l'état actuel.
export default async function ComptePage({ searchParams }: PageProps<"/compte">) {
  const user = await requireUser("/compte");
  const profile = (await getProfile())!;
  const plan = await getPlan();
  const { erreur } = await searchParams;
  const error = authErrorMessage(typeof erreur === "string" ? erreur : null);
  const linked = Object.keys(await listConnections(user.id).catch(() => ({}))).length;
  const hasNames = !!(profile.first_name && profile.last_name);
  const region = profile.country ? new Intl.DisplayNames(["fr"], { type: "region" }).of(profile.country) : null;

  const cards = [
    { href: "/compte/profil", Icon: UserCircle, title: "Profil", text: "Photo, prénom et nom.", state: `${profile.avatar_url ? "Photo ajoutée" : "Pas de photo"} · ${hasNames ? "Nom renseigné" : "Nom à compléter"}` },
    { href: "/compte/reseaux", Icon: ShareNetwork, title: "Réseaux et visibilité", text: "Région, bio, Twitch, Kick, YouTube et ce que tu montres sur l'accueil.", state: `${region ?? "Région à choisir"} · ${profile.show_on_site ? "Visible sur l'accueil" : "Masqué sur l'accueil"}` },
    { href: "/compte/comptes-relies", Icon: PlugsConnected, title: "Comptes reliés", text: "YouTube, Twitch et Kick pour le Multichat.", state: linked ? `${linked} compte${linked > 1 ? "s" : ""} relié${linked > 1 ? "s" : ""}` : "Aucun compte relié" },
    { href: "/compte/securite", Icon: LockKey, title: "Sécurité", text: "Adresse email et mot de passe.", state: user.email ?? "" },
    { href: "/dashboard/abonnement", Icon: Key, title: "Abonnement", text: "Ta formule et ce qu'elle débloque.", state: plan.name },
    { href: "/compte/supprimer", Icon: Trash, title: "Supprimer mon compte", text: "Suppression définitive du compte et des données.", state: "Action irréversible", danger: true },
  ];

  return (
    <>
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className={`group flex h-full flex-col rounded-2xl border bg-surface p-5 transition-colors hover:bg-foreground/[0.05] sm:p-6 ${c.danger ? "border-red-400/30 hover:border-red-400/50" : "border-line hover:border-line-strong"}`}
            >
              <span className={`mb-4 grid h-11 w-11 place-items-center rounded-xl border ${c.danger ? "border-red-400/30 text-red-300" : "border-line text-foreground"}`}>
                <c.Icon size={22} aria-hidden="true" />
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className={`text-base font-semibold ${c.danger ? "text-red-300" : ""}`}>{c.title}</span>
                <span aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                  →
                </span>
              </span>
              <span className="mt-1.5 text-sm leading-relaxed text-muted">{c.text}</span>
              <span data-sensitive={c.title === "Sécurité" ? "" : undefined} className="mt-auto truncate pt-5 font-mono text-xs text-foreground/80">
                {c.state}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
