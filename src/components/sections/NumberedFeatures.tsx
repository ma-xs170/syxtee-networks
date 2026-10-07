import Link from "next/link";
import type { ReactNode } from "react";
import BackpackEncoder from "../illustrations/BackpackEncoder";
import SharedSpaceWire from "../illustrations/SharedSpaceWire";
import { Radio, SlidersHorizontal, Tag, UsersThree } from "../icons";
import BondingDiagram from "../mockups/BondingDiagram";
import { Container } from "../ui";
import RemoteDevices from "../mockups/RemoteDevices";

// Accueil : cinq sections numérotées, séparées par un filet : Relais (01), Contrôle à distance (02), Espaces partagés (03, bandeau pleine largeur),
// Tarifs accessibles (04, liste) et l'encodeur sac à dos (05). Deux rangées image + texte au plus d'affilée, puis un autre gabarit.
// Aucun paiement sur le site : tous les boutons mènent à « Demander l'accès ».

function Row({ id, n, title, text, tags, flip = false, actions, children }: { id?: string; n: string; title: string; text: string; tags: string; flip?: boolean; actions?: ReactNode; children: ReactNode }) {
  return (
    <Container>
      <article id={id} aria-labelledby={`f-${n}`} className="scroll-mt-20 grid grid-cols-1 items-center gap-12 border-t border-line py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className={flip ? "lg:order-2" : ""}>
          <p aria-hidden="true" className="font-mono text-6xl font-semibold text-foreground/15 sm:text-7xl">
            {n}
          </p>
          <h2 id={`f-${n}`} className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">{text}</p>
          <p className="mt-6 text-sm text-foreground/80">{tags}</p>
          {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </div>
        <div className={flip ? "lg:order-1" : ""}>{children}</div>
      </article>
    </Container>
  );
}

export default function NumberedFeatures() {
  return (
    <section aria-label="Fonctionnalités" className="border-b border-line">
      <Row
        id="relais"
        n="01"
        title="Une connexion qui ne lâche pas."
        text="Ton téléphone envoie la vidéo par plusieurs connexions à la fois. SYXTEE les réunit en un seul flux stable : si une connexion faiblit, les autres continuent."
        tags="4G · 5G · Wi-Fi · Starlink · Twitch, YouTube, Kick"
        actions={
          <>
            <Link href="/acces" className="btn btn-primary">
              Demander l&apos;accès
            </Link>
            <Link href="/tarifs" className="btn btn-secondary">
              Voir les tarifs
            </Link>
          </>
        }
      >
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-8" aria-hidden="true">
          <BondingDiagram />
        </div>
      </Row>

      <Row
        id="controle"
        n="02"
        title="Ton OBS dans ta poche."
        text="Mets SYXTEE sur l'écran d'accueil de ton téléphone. Un toucher, et tu changes de scène, règles le son et lances le direct, en plein écran. L'écran reste allumé."
        tags="Scènes · Aperçu du programme · Mixeur audio · Écran d'accueil"
        flip
        actions={
          <>
            <Link href="/application" className="btn btn-primary">
              Mettre sur l&apos;écran d&apos;accueil
            </Link>
            <Link href="/controle-a-distance" className="btn btn-secondary">
              Voir le contrôle
            </Link>
          </>
        }
      >
        <RemoteDevices />
      </Row>

      {/* 03 Espaces partagés : bandeau pleine largeur, pour les régies */}
      <Container>
        <article id="espaces" aria-labelledby="f-03" className="scroll-mt-20 border-t border-line py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p aria-hidden="true" className="font-mono text-6xl font-semibold text-foreground/15 sm:text-7xl">
              03
            </p>
            <h2 id="f-03" className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Espaces partagés, pour les régies.
            </h2>
            <p className="mx-auto mt-5 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
              Une équipe qui veut tout contrôler : connecte plusieurs OBS, invite chaque personne avec son compte et son rôle, et pilote le tout depuis un seul endroit.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-line bg-surface p-4 sm:p-8" aria-hidden="true">
            <SharedSpaceWire />
          </div>
          <ul className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-3">
            {[
              ["Plusieurs OBS", "Chaque ordinateur avec le plugin apparaît dans l'espace."],
              ["Des rôles clairs", "Propriétaire, administrateur ou membre : chacun son niveau."],
              ["Tout au même endroit", "Flux, OBS et sauvegardes de scènes sont ceux de l'espace."],
            ].map(([t, d]) => (
              <li key={t} className="border-t border-line-strong pt-5">
                <h3 className="text-base font-semibold tracking-tight">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/espaces-partages" className="btn btn-primary">
              Découvrir les espaces partagés
            </Link>
            <Link href="/acces" className="btn btn-secondary">
              Demander l&apos;accès
            </Link>
          </div>
        </article>
      </Container>

      {/* 04 Tarifs accessibles : une échelle de prix, pas trois cartes identiques */}
      <Container>
        <article id="tarifs" aria-labelledby="f-04" className="scroll-mt-20 grid grid-cols-1 items-center gap-12 border-t border-line py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:py-28">
          <div>
            <p aria-hidden="true" className="font-mono text-6xl font-semibold text-foreground/15 sm:text-7xl">
              04
            </p>
            <h2 id="f-04" className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Des tarifs accessibles à tous.
            </h2>
            <p className="mt-5 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">
              Le niveau de fiabilité d&apos;une régie, sans le budget d&apos;une régie. Dès 4,99 € par mois, sans engagement : tu changes ou tu arrêtes quand tu veux.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/acces" className="btn btn-primary">
                Demander l&apos;accès
              </Link>
              <Link href="/tarifs" className="btn btn-secondary">
                Comparer les formules
              </Link>
            </div>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {[
              { name: "Basique", price: "4,99", text: "1 flux, le contrôle à distance d'OBS", highlight: false },
              { name: "Premium", price: "9,99", text: "10 flux, 3 directs, 1 espace partagé", highlight: true },
              { name: "Extra", price: "19,99", text: "Flux illimités, 5 espaces partagés pour les régies", highlight: false },
            ].map((t) => (
              <li key={t.name} className={`flex items-center justify-between gap-6 px-6 py-6 ${t.highlight ? "bg-surface" : ""}`}>
                <div className="min-w-0">
                  <p className="flex items-center gap-3 text-lg font-semibold tracking-tight">
                    {t.name}
                    {t.highlight && <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs font-normal text-muted">Le plus choisi</span>}
                  </p>
                  <p className="mt-1 text-sm text-muted">{t.text}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">{t.price} €</span>
                  <span className="block text-xs text-muted">par mois</span>
                </p>
              </li>
            ))}
          </ul>
        </article>
      </Container>

      {/* 05 Encodeur : un sac à dos de stream */}
      <Row
        id="encodeur"
        n="05"
        title="L'encodeur dans ton sac à dos."
        text="Nous développons un sac à dos de stream : plusieurs connexions réunies, un direct stable, des antennes qui font le travail, et un prix accessible. Tu mets ta caméra, tu pars."
        tags="Sac à dos · Multi-connexions · Starlink · Accessible"
        actions={<span className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs uppercase tracking-[0.12em] text-muted">En développement</span>}
      >
        <div className="relative flex items-center justify-center rounded-2xl border border-line bg-surface p-6 sm:p-10" aria-hidden="true">
          <BackpackEncoder className="h-auto w-full max-w-md" />
        </div>
      </Row>
    </section>
  );
}

/** Quatre arguments, sous le hero : chacun renvoie à sa section. Pas de cartes : une rangée séparée par des filets. */
const STRIP = [
  { href: "#relais", Icon: Radio, title: "Relais", text: "Plusieurs connexions réunies en un flux stable." },
  { href: "#controle", Icon: SlidersHorizontal, title: "Contrôle à distance", text: "Pilote OBS depuis ton téléphone." },
  { href: "#espaces", Icon: UsersThree, title: "Espaces partagés", text: "Pour les régies et les équipes." },
  { href: "#tarifs", Icon: Tag, title: "Tarifs accessibles", text: "Dès 4,99 € par mois, sans engagement." },
];

export function FeatureStrip() {
  return (
    <section aria-label="Ce que SYXTEE apporte" className="border-b border-line">
      <Container>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {STRIP.map((f) => (
            <li key={f.title} className="border-t border-line first:border-t-0 sm:max-lg:[&:nth-child(-n+2)]:border-t-0 sm:max-lg:even:border-l lg:border-t-0 lg:border-l lg:first:border-l-0">
              <a href={f.href} className="group flex h-full gap-4 px-2 py-7 transition-colors hover:bg-foreground/[0.03] sm:px-6">
                <f.Icon size={26} className="mt-0.5 shrink-0 text-foreground" aria-hidden="true" />
                <span>
                  <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
                    {f.title}
                    <span aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{f.text}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
