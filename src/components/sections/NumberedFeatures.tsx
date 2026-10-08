import Link from "next/link";
import DeviceFrame from "../device/DeviceFrame";
import FeatureSection from "../device/FeatureSection";
import { Parallax } from "../device/Motion";
import { SHOTS } from "../device/shots";
import { Container } from "../ui";

// Accueil : quatre sections numérotées, séparées par un filet : Relais (01), Contrôle à distance (02), Espaces partagés (03, bandeau pleine largeur),
// Tarifs accessibles (04, liste) et l'encodeur sac à dos (05). Deux rangées image + texte au plus d'affilée, puis un autre gabarit.
// Aucun paiement sur le site : tous les boutons mènent à « Demander l'accès ».

export default function NumberedFeatures() {
  return (
    <section aria-label="Fonctionnalités" className="border-b border-line">
      <FeatureSection
        id="relais"
        n="01"
        title="Une connexion qui ne lâche pas."
        text="Ton téléphone envoie la vidéo par plusieurs connexions à la fois. SYXTEE les réunit en un seul flux stable : si une connexion faiblit, les autres continuent."
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
        {/* Section 01 → portable + carte flottante, car la fiabilité se lit dans la santé du flux (écran de gestion) ; pas de téléphone. */}
        <Parallax>
          <div className="relative sm:pb-10">
            <DeviceFrame variant="laptop" shot={SHOTS.sante} />
          </div>
        </Parallax>
      </FeatureSection>

      <FeatureSection
        id="controle"
        n="02"
        title="Ton OBS dans ta poche."
        text="Mets SYXTEE sur l'écran d'accueil de ton téléphone. Un toucher, et tu changes de scène, règles le son et lances le direct, en plein écran. L'écran reste allumé."
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
        {/* Section 02 → téléphone seul : le contrôle d'OBS se fait en direct, en déplacement, une main sur le téléphone. */}
        <Parallax>
          <DeviceFrame variant="phone" shot={SHOTS.controleMobile} />
        </Parallax>
      </FeatureSection>

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
          <div className="mx-auto mt-14 max-w-3xl">
            {/* Section 03 → grand écran seul : gérer les membres et les rôles est un travail de bureau, pas de téléphone. */}
            <Parallax distance={20}>
              <DeviceFrame variant="desktop" shot={SHOTS.membres} />
            </Parallax>
          </div>
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

    </section>
  );
}
