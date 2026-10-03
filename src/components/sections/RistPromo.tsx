import Link from "next/link";
import RelayServer from "../illustrations/RelayServer";
import Wordmark from "../Wordmark";
import { CREATE_RELAY_HREF, Container } from "../ui";
import Highlight from "../ui/Highlight";

// Accueil : le RIST (nouveauté). Protocole des régies de télévision, ici pour la première fois pour les particuliers.
// Trois cases pour trois contenus : une grande (le message, le dessin, les boutons) et deux petites (les deux preuves).

export default function RistPromo() {
  return (
    <section id="rist" aria-labelledby="rist-titre" className="border-b border-line py-24">
      <Container>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 md:grid-rows-2">
          <article className="relative flex flex-col gap-8 bg-gradient-to-br from-accent/[0.07] via-background to-background p-6 sm:p-10 md:col-span-2 md:row-span-2 md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Wordmark name="RIST" />
                <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Nouveau</span>
              </div>
              <h2 id="rist-titre" className="h-section mt-5 max-w-xl">
                Le protocole de la télé, <Highlight>enfin pour toi.</Highlight>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
                Les chaînes de télévision l&apos;utilisent pour envoyer leurs directs. SYXTEE est le premier site à l&apos;offrir aux particuliers, sur le même relais que SRTLA et RTMP.
              </p>
            </div>
            <div className="hover-play relative mx-auto h-44 w-full max-w-md" aria-hidden="true">
              <RelayServer />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={CREATE_RELAY_HREF} className="btn btn-primary">
                Créer un relais RIST
              </Link>
              <Link href="/docs/rist" className="btn btn-secondary">
                Guide RIST
              </Link>
            </div>
          </article>

          <article className="bg-background p-6 transition-colors hover:bg-surface sm:p-8">
            <h3 className="text-xl font-semibold">Les paquets perdus reviennent</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">Quand le débit chute, le relais redemande ce qui manque. Résultat : moins de saccades quand le réseau est faible.</p>
          </article>

          <article className="bg-background p-6 transition-colors hover:bg-surface sm:p-8">
            <h3 className="text-xl font-semibold">Chiffré en AES-256</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">Un port et un secret par relais. Sans le secret, rien n&apos;entre. Compatible Moblin, encodeurs RIST, OBS et FFmpeg.</p>
          </article>
        </div>
      </Container>
    </section>
  );
}
