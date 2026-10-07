import Link from "next/link";
import type { ReactNode } from "react";
import PocketRouter from "../illustrations/PocketRouter";
import RelayServer from "../illustrations/RelayServer";
import { CREATE_RELAY_HREF, Container } from "../ui";
import RemoteObsMock from "../mockups/RemoteObsMock";

// Accueil : trois rangées numérotées (01 à 03), séparées par un filet, le visuel change de côté d'une rangée à l'autre.
// Chaque rangée : grand numéro, titre, deux phrases, la liste des fonctions, et un visuel.

function Row({ n, title, text, tags, flip = false, actions, children }: { n: string; title: string; text: string; tags: string; flip?: boolean; actions?: ReactNode; children: ReactNode }) {
  return (
    <Container>
      <article aria-labelledby={`f-${n}`} className="grid grid-cols-1 items-center gap-12 border-t border-line py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">
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
        title="Des flux fiables, partout."
        text="SRTLA pour le bonding en mobilité, RTMP pour une caméra ou OBS, et le RIST, le protocole des régies de télévision, chiffré en AES-256."
        tags="SRTLA · RTMP · RIST · 4G, 5G, Wi-Fi et Starlink"
        actions={
          <>
            <Link href={CREATE_RELAY_HREF} className="btn btn-primary">
              Créer un flux
            </Link>
            <Link href="/tarifs" className="btn btn-secondary">
              Voir les tarifs
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
        title="Tu pilotes OBS depuis un onglet."
        text="Change de scène depuis ton téléphone, au fond du jardin. Comme devant ton écran : aperçu du programme, sources, mixeur audio et contrôle du direct."
        tags="Scènes · Aperçu du programme · Sources · Mixeur audio"
        flip
        actions={
          <Link href="/controle-a-distance" className="btn btn-secondary">
            Découvrir le contrôle à distance
          </Link>
        }
      >
        <RemoteObsMock />
      </Row>

      <Row
        n="03"
        title="Un encodeur qui tient dans un sac."
        text="Nous développons un encodeur portable pour caméra : plusieurs connexions réunies, un direct stable, et un prix accessible."
        tags="Portable · Multi-connexions · Accessible"
        actions={<span className="inline-flex h-9 items-center rounded-md border border-line px-3 text-xs uppercase tracking-[0.12em] text-muted">En développement</span>}
      >
        <div className="relative flex h-72 items-center justify-center rounded-2xl border border-line bg-surface p-8 sm:h-80" aria-hidden="true">
          <PocketRouter />
        </div>
      </Row>
    </section>
  );
}
