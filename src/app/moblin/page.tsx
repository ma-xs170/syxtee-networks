import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import NextStep from "@/components/NextStep";
import MoblinStory from "@/components/moblin/MoblinStory";
import PhoneAndroid from "@/components/illustrations/PhoneAndroid";
import CopyCode from "@/components/CopyCode";
import PhoneMockup from "@/components/PhoneMockup";
import { Container, SectionHeader } from "@/components/ui";
import { creditFor } from "@/lib/credits";

export const metadata: Metadata = {
  title: "Moblin",
  description:
    "Moblin, l'app iPhone gratuite et open source qu'on recommande pour l'IRL : pourquoi elle, comment la configurer avec le relais SRTLA SYXTEE en 6 étapes, et les réglages conseillés.",
  alternates: { canonical: "/moblin" },
};

const appStoreUrl = "https://apps.apple.com/app/id6466745933";
const readmeUrl = "https://github.com/eerimoq/moblin#readme";
const iconCredit = creditFor("icon.png");

// Fonctionnalités vérifiées dans le README officiel de Moblin (readmeUrl).
const features = [
  "RTMP",
  "SRT",
  "SRTLA",
  "RIST",
  "H.264 / H.265",
  "Jusqu'à 4K60",
  "App Apple Watch : chat, contrôle du live, changement de scène",
];
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
        <PhoneMockup src={img} alt={alt} sizes="220px" />
      </div>
    </li>
  );
}

export default function MoblinPage() {
  return (
    <>
      <MoblinStory />

      <section className="border-b border-line py-10">
        <Container>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Fonctionnalités vérifiées</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {features.map((f) => (
              <li key={f} className="rounded-full border border-line px-4 py-2 font-mono text-xs text-foreground">{f}</li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            Source :{" "}
            <a href={readmeUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
              README officiel de Moblin
            </a>
          </p>
        </Container>
      </section>

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

      <section id="tutoriel" className="scroll-mt-16 border-b border-line py-20 sm:py-24">
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

      {/* Renvoi court vers la page Saily */}
      <section id="saily" className="scroll-mt-20 border-b border-line py-16">
        <Container>
          <Link
            href="/saily"
            className="group grid items-center gap-6 rounded-3xl border border-line bg-gradient-to-b from-white/[0.06] to-transparent p-6 transition-colors hover:bg-white/[0.04] sm:grid-cols-[auto_1fr_auto] sm:p-8"
          >
            <span className="mx-auto h-32 w-28 transition-transform duration-300 group-hover:-translate-y-1 sm:mx-0">
              <PhoneAndroid screen="moblink" />
            </span>
            <span>
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-muted">+ 4G avec Saily</span>
                <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                  Partenaire
                </span>
              </span>
              <span className="mt-3 block text-xl font-medium leading-snug sm:text-2xl">
                Une 2e 4G dans ton bonding, avec une eSIM sur un 2e téléphone et Moblink.
              </span>
            </span>
            <span className="inline-flex items-center gap-2 text-sm text-foreground">
              Voir le guide Saily <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
            </span>
          </Link>
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
            Moblin est une app indépendante. SYXTEE NETWORKS n&apos;est pas affilié au développeur de Moblin.
          </p>
          {iconCredit && (
            <p className="mt-2 text-xs text-muted">
              Logo Moblin © {iconCredit.author} — licence{" "}
              <a href={iconCredit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-4 hover:text-foreground">
                {iconCredit.license}
              </a>
              .
            </p>
          )}
        </Container>
      </section>

      <NextStep label="Starlink en IRL" href="/starlink" />
    </>
  );
}
