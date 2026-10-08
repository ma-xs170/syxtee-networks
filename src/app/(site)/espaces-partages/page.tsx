import type { Metadata } from "next";
import Link from "next/link";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import { Check } from "@/components/icons";
import DeviceScene from "@/components/mockups/Devices";
import { Container } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";

export const metadata: Metadata = {
  title: "Espaces partagés pour les régies",
  description: "Connecte plusieurs OBS, invite ton équipe avec des rôles, et contrôle tout depuis un seul espace. Pour les régies, les équipes et les chaînes à plusieurs.",
  alternates: { canonical: "/espaces-partages" },
};

const btn =
  "inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap rounded-xl px-7 text-base font-medium transition-[background-color,transform] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

const POINTS: [string, string][] = [
  ["Plusieurs OBS, un espace", "Installe le plugin sur chaque ordinateur : tous apparaissent dans l'espace, pilotables depuis un téléphone ou un navigateur."],
  ["Chacun son compte et son rôle", "Tu invites par e-mail. Chaque personne se connecte avec son propre compte : pas de mot de passe partagé."],
  ["Les flux et les sauvegardes de l'équipe", "Les flux, les OBS reliés et les sauvegardes de scènes appartiennent à l'espace, séparés de ton espace personnel."],
  ["Un espace par chaîne ou par client", "Crée plusieurs espaces et passe de l'un à l'autre en un clic depuis le menu."],
];

// [droit, membre, administrateur, propriétaire]
const RIGHTS: [string, boolean, boolean, boolean][] = [
  ["Voir et piloter les OBS de l'espace", true, true, true],
  ["Voir les flux, les statistiques et l'historique", true, true, true],
  ["Créer, modifier et supprimer des flux", false, true, true],
  ["Inviter et retirer des membres", false, true, true],
  ["Changer les rôles, retirer un administrateur", false, false, true],
  ["Renommer l'espace", false, true, true],
  ["Supprimer l'espace", false, false, true],
];

export default function EspacesPartagesPage() {
  return (
    <>
      <section data-theme="dark" className="relative -mt-[4.0625rem] overflow-hidden border-b border-line bg-background pb-16 pt-[9rem] text-foreground sm:pb-20 sm:pt-[10.5rem]">
        <CloudBackdrop />
        <Container className="relative text-center">
          <h1 className="h-hero mx-auto max-w-3xl">
            Tout contrôler, <Highlight>à plusieurs.</Highlight>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg">Les espaces partagés sont faits pour les régies : plusieurs OBS, une équipe, un seul endroit.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/acces" className={`${btn} border border-line-strong bg-accent text-on-accent hover:bg-accent-hover`}>
              Demander l&apos;accès
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href="/tarifs" className={`${btn} border border-foreground/20 bg-background/60 text-foreground backdrop-blur-sm hover:bg-background/90`}>
              Voir les tarifs
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="max-w-4xl">
          <DeviceScene
            kind="display"
            main={{ src: "/images/screens/membres-bureau.png", alt: "Page Membres d'un espace partagé : propriétaire, administrateur et membres avec leurs rôles, invitation en attente" }}
            phone={{ src: "/images/remote/controle-mobile.png", alt: "Contrôle à distance d'un OBS de l'espace depuis un téléphone" }}
          />
          <ul className="mt-14 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
            {POINTS.map(([t, d]) => (
              <li key={t} className="border-t border-line-strong pt-5">
                <h2 className="text-lg font-semibold tracking-tight">{t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="max-w-4xl">
          <h2 className="h-section">Des rôles clairs.</h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted">Le propriétaire a la main sur tout. Il donne à chaque membre le niveau qu&apos;il faut, ni plus ni moins.</p>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-4 pr-4 font-normal text-muted">
                    <span className="sr-only">Droit</span>
                  </th>
                  {["Membre", "Administrateur", "Propriétaire"].map((r) => (
                    <th key={r} scope="col" className="w-32 py-4 text-center font-semibold">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RIGHTS.map(([label, ...v]) => (
                  <tr key={label} className="border-b border-line">
                    <th scope="row" className="py-3.5 pr-4 font-normal">
                      {label}
                    </th>
                    {v.map((ok, i) => (
                      <td key={i} className="py-3.5 text-center">
                        {ok ? <Check size={18} weight="bold" className="mx-auto" aria-label="Oui" /> : <span className="text-muted" aria-label="Non">·</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section className="py-20 text-center sm:py-24">
        <Container className="max-w-2xl">
          <h2 className="h-section">Inclus dans Signature et Prestige.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted">1 espace partagé avec Signature (9,99 € par mois), jusqu&apos;à 5 avec Prestige (19,99 € par mois). Sans engagement.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/acces" className="btn btn-primary">
              Demander l&apos;accès
            </Link>
            <Link href="/tarifs" className="btn btn-secondary">
              Voir les tarifs
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
