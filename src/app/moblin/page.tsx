import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import PageHero from "@/components/PageHero";
import Figure from "@/components/Figure";
import NextStep from "@/components/NextStep";
import CopyCode from "@/components/CopyCode";
import { Container, DiscordButton, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Moblin",
  description:
    "Moblin, l'app iPhone gratuite et open source qu'on recommande pour l'IRL : pourquoi elle, comment la configurer avec le relais SRTLA SYXTEE en 6 étapes, et les réglages conseillés.",
  alternates: { canonical: "/moblin" },
};

const appStoreUrl = "https://apps.apple.com/app/moblin/id6466745933";
const srtlaUrl = "srtla://<ADRESSE_RELAIS>:<PORT>?streamid=<TON_ID>";

const reasons = [
  {
    n: "01",
    title: "Gratuite et open source",
    text: "Toutes les fonctions sont gratuites, sans abonnement ni filigrane. Le code est public : tout le monde peut voir comment l'app fonctionne.",
  },
  {
    n: "02",
    title: "Bonding SRTLA natif",
    text: "Moblin envoie ta vidéo en SRTLA sur plusieurs connexions à la fois (4G, 5G, Wi-Fi), sans app en plus.",
  },
  {
    n: "03",
    title: "Overlays et scènes dans l'app",
    text: "Widgets texte, images, navigateur, chat et plusieurs scènes, directement sur ton téléphone, en plus de ce que tu gères dans OBS.",
  },
  {
    n: "04",
    title: "Mises à jour très fréquentes",
    text: "Le développeur publie des nouveautés et des corrections en continu. Les dernières versions chauffent moins, et l'app suit de près les besoins des streamers IRL.",
  },
];

const settings = [
  { k: "Résolution", v: "1080p" },
  { k: "Images/s", v: "30 ou 60 fps" },
  { k: "Codec", v: "H.265 / HEVC si possible" },
  { k: "Bitrate adaptatif", v: "Activé" },
  { k: "Bitrate max", v: "6000 kbit/s" },
  { k: "Audio", v: "AAC 128 kbit/s" },
];

const tips = [
  { t: "Un forfait data illimité", d: "Une heure de live à 6000 kbit/s consomme environ 2,7 Go. Un forfait limité se vide en quelques lives." },
  { t: "Une batterie externe", d: "L'encodage vide la batterie vite. Une batterie USB-C à charge rapide (PD) te garde en live toute la soirée." },
  { t: "Pas de soleil direct sur le téléphone", d: "La chaleur fait baisser les performances et peut couper le live. Reste à l'ombre quand tu peux, et retire la coque." },
  { t: "Teste ton setup avant l'événement", d: "Un live test de 5 minutes la veille : image dans OBS, son, bonding. Mieux vaut trouver le souci chez toi qu'en direct." },
];

function Step({ n, title, img, alt, children }: { n: string; title: string; img: string; alt: string; children: ReactNode }) {
  return (
    <li className="grid items-center gap-8 border-b border-line py-12 last:border-b-0 md:grid-cols-[1fr_220px] md:gap-16">
      <div className="min-w-0">
        <p className="font-mono text-sm text-muted">{n}</p>
        <h3 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h3>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-muted">{children}</div>
      </div>
      <div className="mx-auto w-full max-w-[220px]">
        <Figure src={img} alt={alt} ratio="9/19.5" />
      </div>
    </li>
  );
}

export default function MoblinPage() {
  return (
    <>
      <PageHero
        kicker="App recommandée"
        title="Moblin, ton encodeur IRL dans la poche."
        crumb="Moblin"
        actions={
          <>
            <a
              href={appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
                <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.9 5c.7-.9 1.2-2 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5Z" />
              </svg>
              Télécharger sur l&apos;App Store
            </a>
            <DiscordButton variant="ghost">Besoin d&apos;aide ? Discord</DiscordButton>
          </>
        }
      >
        L&apos;app iOS gratuite et open source qui transforme ton iPhone en encodeur IRL : compatible SRTLA, pensée pour
        streamer dehors.
      </PageHero>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Pourquoi Moblin" title="Pourquoi on la recommande." />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {reasons.map((r) => (
              <article key={r.n} className="bg-black p-8 transition-colors hover:bg-neutral-950">
                <p className="font-mono text-sm text-muted">{r.n}</p>
                <h3 className="mt-6 text-xl font-semibold">{r.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{r.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Tutoriel" title="Configurer Moblin avec SYXTEE.">
            Six étapes, une dizaine de minutes. Garde le Discord ouvert à côté : ton adresse de relais et ton identifiant
            y sont donnés à l&apos;ouverture de ton accès.
          </SectionHeader>

          <ol className="mt-8">
            <Step n="01" title="Installe Moblin" img="/images/moblin/etape-01.jpg" alt="Moblin sur l'App Store">
              <p>
                Télécharge Moblin gratuitement sur l&apos;
                <a href={appStoreUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                  App Store
                </a>
                , puis ouvre-la et autorise l&apos;accès à la caméra et au micro.
              </p>
            </Step>

            <Step n="02" title="Crée un nouveau stream" img="/images/moblin/etape-02.jpg" alt="Moblin, Settings puis Streams">
              <p>
                Va dans <strong className="font-medium text-foreground">Settings → Streams</strong>, puis crée un nouveau
                stream. Donne-lui un nom clair, par exemple « SYXTEE ».
              </p>
            </Step>

            <Step n="03" title="Colle l'URL du relais" img="/images/moblin/etape-03.jpg" alt="Moblin, champ URL du stream">
              <p>Dans le champ URL du stream, colle l&apos;adresse SRTLA :</p>
              <CopyCode code={srtlaUrl} />
              <p className="text-sm">
                Remplace <span className="font-mono text-foreground">&lt;ADRESSE_RELAIS&gt;</span>,{" "}
                <span className="font-mono text-foreground">&lt;PORT&gt;</span> et{" "}
                <span className="font-mono text-foreground">&lt;TON_ID&gt;</span> par les valeurs qu&apos;on te donne sur le
                Discord. Ne partage jamais ton identifiant.
              </p>
            </Step>

            <Step n="04" title="Active le bonding" img="/images/moblin/etape-04.jpg" alt="Moblin, choix des connexions pour le bonding">
              <p>
                Dans les réglages SRT(LA) du stream, vérifie que le bonding utilise bien le{" "}
                <strong className="font-medium text-foreground">cellulaire</strong> et le{" "}
                <strong className="font-medium text-foreground">Wi-Fi</strong>. Le Wi-Fi peut venir du partage de connexion
                d&apos;un deuxième téléphone, d&apos;un modem de poche ou d&apos;un{" "}
                <Link href="/starlink" className="text-foreground underline underline-offset-4">Starlink</Link>.
              </p>
            </Step>

            <Step n="05" title="Règle la vidéo et l'audio" img="/images/moblin/etape-05.jpg" alt="Moblin, réglages vidéo du stream">
              <p>Les réglages qu&apos;on conseille pour démarrer :</p>
              <table className="w-full border-y border-line text-sm">
                <tbody className="divide-y divide-line">
                  {settings.map((s) => (
                    <tr key={s.k}>
                      <th scope="row" className="py-3 pr-4 text-left font-mono text-xs font-normal uppercase tracking-[0.1em] text-muted">
                        {s.k}
                      </th>
                      <td className="py-3 text-right text-foreground">{s.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm">
                <span className="font-mono text-foreground">Note :</span> si le réseau est faible, baisse à{" "}
                <strong className="font-medium text-foreground">720p</strong>. L&apos;image sera plus stable avec moins de
                data.
              </p>
            </Step>

            <Step n="06" title="Lance le live et ajoute la source dans OBS" img="/images/moblin/etape-06.jpg" alt="Moblin en live">
              <p>
                Sélectionne le stream SYXTEE et appuie sur <strong className="font-medium text-foreground">Go Live</strong>.
                Dans OBS, ajoute ensuite la source SRT du relais :{" "}
                <Link href="/fonctionnement" className="text-foreground underline underline-offset-4">
                  voir comment faire
                </Link>
                .
              </p>
            </Step>
          </ol>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Terrain" title="Astuces terrain." />
          <ul className="divide-y divide-line border-y border-line">
            {tips.map((t) => (
              <li key={t.t} className="py-5">
                <p className="text-base font-medium">{t.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.d}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <aside className="rounded-2xl border border-line bg-white/[0.02] p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Android</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight">Sur Android ?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Moblin n&apos;existe que sur iPhone. Sur Android, <strong className="font-medium text-foreground">IRL Pro</strong>{" "}
              est l&apos;équivalent : il gère aussi le SRTLA et le bonding. Tu utilises la même URL SRTLA, et rien ne change
              côté relais ou OBS.
            </p>
          </aside>
          <p className="mt-8 text-xs text-muted">
            Moblin est une app indépendante. SYXTEE NETWORKS n&apos;est pas affilié à son développeur.
          </p>
        </Container>
      </section>

      <NextStep label="Starlink en IRL" href="/starlink" />
    </>
  );
}
