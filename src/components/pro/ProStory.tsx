"use client";

import Link from "next/link";
import ScrollStory, { type StoryScene } from "@/components/story/ScrollStory";
import Highlight from "@/components/ui/Highlight";
import { DiscordButton, MoreLink } from "@/components/ui";
import { pro } from "@/lib/site";
import ProExploded from "./ProExploded";
import { PlacesGrid } from "./ProPlaces";
import ProStage from "./ProStage";

// Histoire SYXTEE PRO (accueil + /pro), 4 scènes : squelette qui tourne → vue éclatée → partout → prix.
// Un seul visuel persistant (scène 3D) en version animée ; illustrations SVG statiques en prefers-reduced-motion.

export function SoonBadge() {
  return (
    <p className="mb-3 inline-flex items-center rounded-full sm:mb-5 border border-line bg-accent/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-foreground">
      Bientôt disponible
    </p>
  );
}

export function PriceBlock({ more = false }: { more?: boolean }) {
  return (
    <div>
      <SoonBadge />
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Prix de lancement</p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 sm:mt-2">
        <span className="text-4xl font-semibold tracking-tight tabular-nums sm:text-6xl">{pro.launchPrice}</span>
        <span className="text-sm text-muted">
          Prix public prévu : <s className="tabular-nums">{pro.publicPrice}</s>
        </span>
      </p>
      <p className="mt-2 text-xs text-muted">Prix indicatif, Starlink Mini non inclus.</p>
      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-center">
        <DiscordButton>Être prévenu du lancement</DiscordButton>
        {more && <MoreLink href="/pro">Découvrir le SYXTEE PRO</MoreLink>}
      </div>
    </div>
  );
}

function Breadcrumb() {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-6 font-mono text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-foreground">
            Accueil
          </Link>
        </li>
        <li aria-hidden="true" className="text-foreground/20">
          /
        </li>
        <li aria-current="page" className="text-foreground">
          SYXTEE PRO
        </li>
      </ol>
    </nav>
  );
}

function scenes(page: "home" | "pro"): StoryScene[] {
  return [
    {
      kicker: "01 · SYXTEE PRO",
      titleAs: page === "pro" ? "h1" : "h2",
      title: (
        <>
          Le live pro. <Highlight>Partout.</Highlight>
        </>
      ),
      header: page === "pro" ? <Breadcrumb /> : <SoonBadge />,
      paragraphs: [
        "Le SYXTEE PRO, c'est notre sac encodeur IRL : tout ton live tient dans un sac à dos en mesh technique.",
        "Ta caméra, tes connexions et l'énergie au même endroit. Tu n'as plus qu'à marcher.",
      ],
      render: () => <ProExploded closed />,
    },
    {
      kicker: "02 · Vue éclatée",
      title: "Tout est dedans.",
      paragraphs: [
        "Un boîtier encodeur SYXTEE qui combine plusieurs cartes SIM et eSIM en 4G/5G, en même temps.",
        "Un compartiment dédié au Starlink Mini dans le dos, et 2 batteries USB-C haute puissance qui alimentent l'encodeur et le Starlink.",
      ],
      render: () => <ProExploded />,
    },
    {
      kicker: "03 · Partout",
      title: (
        <>
          N&apos;importe quelle caméra.
          <br />
          <Highlight>N&apos;importe où.</Highlight>
        </>
      ),
      paragraphs: [
        "Branche n'importe quelle caméra en HDMI, ajoute ton iPhone en USB-C ou un Starlink Mini.",
        "Dès qu'il y a une connexion, ton flux part vers le relais SYXTEE, puis dans ton OBS.",
      ],
      footer: (
        <p className="text-xs text-muted">
          * En vol : uniquement avec une connexion et des autorisations adaptées.{" "}
          <Link href="/pro#mentions" className="underline underline-offset-2 hover:text-foreground">
            Voir les mentions
          </Link>
        </p>
      ),
      render: () => <PlacesGrid />,
    },
    {
      kicker: "04 · Prix",
      title: "Le sac encodeur pro le moins cher du marché.",
      paragraphs: [],
      footer: <PriceBlock more={page === "home"} />,
      render: () => <ProExploded closed />,
    },
  ];
}

export default function ProStory({ page }: { page: "home" | "pro" }) {
  return (
    <ScrollStory
      id={page === "home" ? "syxtee-pro" : undefined}
      aria-label="SYXTEE PRO, le sac encodeur IRL"
      className="border-b border-line"
      scenes={scenes(page)}
      height="440vh"
      stage={(p) => <ProStage p={p} />}
    />
  );
}
