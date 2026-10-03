import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import RelayServer from "../illustrations/RelayServer";
import { CREATE_RELAY_HREF, Container } from "../ui";
import ChatDemo from "./ChatDemo";
import DashboardViews from "./DashboardViews";

// Accueil : quatre rangées numérotées (01 à 04), séparées par un filet, le visuel change de côté d'une rangée à l'autre.
// Chaque rangée : grand numéro, titre, deux phrases, la liste des fonctions, et un visuel.

function Row({ n, title, text, tags, flip = false, actions, children }: { n: string; title: string; text: string; tags: string; flip?: boolean; actions?: ReactNode; children: ReactNode }) {
  return (
    <Container>
      <article aria-labelledby={`f-${n}`} className="grid items-center gap-12 border-t border-line py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
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
        n="01"
        title="Un relais pour chaque appareil."
        text="SRTLA pour le bonding en mouvement, RTMP pour une caméra DJI, GoPro ou OBS, et le RIST, le protocole des régies de télévision, chiffré en AES-256."
        tags="SRTLA · RTMP · RIST · 4G, 5G, Wi-Fi et Starlink"
        actions={
          <>
            <Link href={CREATE_RELAY_HREF} className="btn btn-primary">
              Créer un relais
            </Link>
            <Link href="/docs/rist" className="btn btn-secondary">
              Guide RIST
            </Link>
          </>
        }
      >
        <div className="hover-play relative flex h-72 items-center justify-center rounded-2xl border border-line bg-surface p-8 sm:h-80" aria-hidden="true">
          <RelayServer />
        </div>
      </Row>

      <Row
        n="02"
        title="Tu vois ton direct d'un coup d'œil."
        text="Le statut du direct, ton activité sur 7 et 30 jours, et la santé du flux mesurée chaque seconde, au même endroit."
        tags="Vue d'ensemble · Mes relais · Santé du flux"
        flip
      >
        <DashboardViews />
      </Row>

      <Row
        n="03"
        title="Tu pilotes OBS depuis un onglet."
        text="Change de scène depuis ton téléphone, lance le direct et règle l'audio. Comme devant ton écran."
        tags="Scènes · Aperçu du programme · Mixeur audio"
        actions={
          <Link href="/syxtee-studio" className="btn btn-secondary">
            Découvrir le studio
          </Link>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-line bg-surface p-3 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] sm:p-4">
          <Image
            src="/images/outils/studio-v2.png"
            alt="SYXTEE STUDIO : la régie avec la liste des scènes, le programme en direct et le bouton pour terminer le stream."
            width={2200}
            height={1342}
            sizes="(min-width: 1024px) 560px, 100vw"
            className="h-auto w-full rounded-lg"
          />
        </div>
      </Row>

      <Row
        n="04"
        title="Tous tes chats, un seul fil."
        text="Un clic sur un logo affiche une plateforme ou plusieurs. Twitch et Kick se mélangent dans la même liste, YouTube a son panneau. Écris-leur depuis ton compte relié."
        tags="YouTube · Twitch · Kick"
        flip
      >
        <figure>
          <ChatDemo />
          <figcaption className="mt-3 text-xs text-muted">Exemple de messages.</figcaption>
        </figure>
      </Row>
    </section>
  );
}
