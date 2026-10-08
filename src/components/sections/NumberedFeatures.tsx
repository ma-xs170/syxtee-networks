import Link from "next/link";
import DeviceFrame from "../device/DeviceFrame";
import FeatureSection from "../device/FeatureSection";
import { Parallax } from "../device/Motion";
import { SHOTS } from "../device/shots";
import { Container } from "../ui";
import { MultistreamDock, PlatformLogos } from "./Multistream";

// Accueil : le site se présente comme le contrôle à distance d'OBS Studio, avec multistream et relais. Cinq sections numérotées, séparées par un filet :
// Contrôle à distance (01), Multistream (02), Relais (03, bandeau), Espaces partagés (04, bandeau texte) et Tarifs accessibles (05, liste).
// Aucun paiement sur le site : tous les boutons mènent à « Demander l'accès ».

const banner = "scroll-mt-20 border-t border-line py-20 lg:py-28";
const num = "font-mono text-6xl font-semibold text-foreground/15 sm:text-7xl";

export default function NumberedFeatures() {
  return (
    <section aria-label="Fonctionnalités" className="border-b border-line">
      <FeatureSection
        id="controle"
        n="01"
        title="Ton OBS Studio dans ta poche."
        text="Scènes, sources, mixeur audio, aperçu du programme, direct et enregistrement : l'interface d'OBS Studio sur ton téléphone ou ton ordinateur, et chaque bouton agit sur ton vrai OBS."
        actions={
          <>
            <Link href="/controle-a-distance" className="btn btn-primary">
              Voir le contrôle à distance
            </Link>
            <Link href="/application" className="btn btn-secondary">
              Mettre sur l&apos;écran d&apos;accueil
            </Link>
          </>
        }
      >
        <Parallax>
          <DeviceFrame variant="phone" shot={SHOTS.controleMobile} />
        </Parallax>
      </FeatureSection>

      <FeatureSection
        id="multistream"
        n="02"
        title="Multistream : un direct, toutes tes plateformes."
        text="Choisis le logo de la plateforme, colle ta clé de stream : le serveur est déjà rempli. Un toucher lance ou arrête chaque diffusion. Tout part de ton ordinateur, avec l'encodeur matériel d'OBS."
        flip
        actions={
          <>
            <Link href="/acces" className="btn btn-primary">
              Demander l&apos;accès
            </Link>
            <Link href="/controle-a-distance" className="btn btn-secondary">
              Voir le contrôle
            </Link>
          </>
        }
      >
        <div className="grid gap-8">
          <MultistreamDock />
          <PlatformLogos />
        </div>
      </FeatureSection>

      {/* 03 Relais : bandeau pleine largeur */}
      <Container>
        <article id="relais" aria-labelledby="f-03" className={banner}>
          <div className="mx-auto max-w-3xl text-center">
            <p aria-hidden="true" className={num}>
              03
            </p>
            <h2 id="f-03" className="mt-6 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
              Relais : une connexion qui ne lâche pas.
            </h2>
            <p className="mx-auto mt-5 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
              Ton téléphone envoie la vidéo par plusieurs connexions à la fois (4G, 5G, Wi-Fi, Starlink). SYXTEE les réunit en un seul flux stable : si une faiblit, les autres continuent.
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-3xl">
            <Parallax distance={20}>
              <DeviceFrame variant="laptop" shot={SHOTS.sante} />
            </Parallax>
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/relais" className="btn btn-primary">
              Découvrir les relais
            </Link>
            <Link href="/acces" className="btn btn-secondary">
              Demander l&apos;accès
            </Link>
          </div>
        </article>
      </Container>

      {/* 04 Espaces partagés : texte seul, pour les régies */}
      <Container>
        <article id="espaces" aria-labelledby="f-04" className={banner}>
          <div className="mx-auto max-w-3xl text-center">
            <p aria-hidden="true" className={num}>
              04
            </p>
            <h2 id="f-04" className="mt-6 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
              Espaces partagés, pour les régies.
            </h2>
            <p className="mx-auto mt-5 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
              Connecte plusieurs OBS, invite chaque personne avec son compte et son rôle, et pilote le tout depuis un seul endroit.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/espaces-partages" className="btn btn-primary">
                Découvrir les espaces partagés
              </Link>
            </div>
          </div>
        </article>
      </Container>

      {/* 04 Tarifs accessibles : une échelle de prix, pas trois cartes identiques */}
      <Container>
        <article id="tarifs" aria-labelledby="f-05" className="scroll-mt-20 grid grid-cols-1 items-center gap-12 border-t border-line py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20 lg:py-28">
          <div>
            <p aria-hidden="true" className="font-mono text-6xl font-semibold text-foreground/15 sm:text-7xl">
              05
            </p>
            <h2 id="f-05" className="mt-6 text-3xl font-medium tracking-[-0.03em] sm:text-4xl">
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
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line">
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

    </section>
  );
}
