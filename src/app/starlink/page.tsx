import type { Metadata } from "next";
import Link from "next/link";
import NextStep from "@/components/NextStep";
import PopOutImage, { PopOutArt } from "@/components/PopOutImage";
import StarlinkDiagram from "@/components/blocks/StarlinkDiagram";
import DishMini from "@/components/illustrations/DishMini";
import { Container, DiscordButton, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Starlink Mini en IRL",
  description:
    "Starlink Mini × SYXTEE : le Mini dans ton sac, Moblin sur ton iPhone et le bonding SRTLA qui combine satellite et 4G/5G pour streamer là où la 4G abandonne.",
  alternates: { canonical: "/starlink" },
};

const specSheetUrl = "https://starlink.com/public-files/specification_sheet_mini_fr-FR.pdf";
const roamUrl = "https://starlink.com/fr/roam";
const linkClass = "text-foreground underline underline-offset-4";

// Chiffres issus de la fiche technique officielle Starlink Mini (specSheetUrl).
const specs = [
  {
    big: "1,10 kg",
    title: "Il tient dans un sac à dos",
    text: "298,5 × 259 × 38,5 mm : à peine plus grand qu'une feuille A4, à plat au fond du sac.",
  },
  {
    big: "Wi-Fi intégré",
    title: "Pas de boîtier en plus",
    text: "Routeur Wi-Fi 5 double bande intégré : ton iPhone s'y connecte directement.",
  },
  {
    big: "USB-C 100 W",
    title: "Alimentable par powerbank",
    text: "Powerbank USB-C PD 100 W (20 V / 5 A minimum), avec le câble Starlink USB-C vers prise coaxiale (accessoire).",
  },
  {
    big: "25–40 W",
    title: "Consommation moyenne",
    text: "De quoi tenir une session IRL sur batterie, sans groupe électrogène.",
    note: "Estimation : environ 2 à 3 h avec une powerbank de 100 Wh selon l'usage.",
  },
  {
    big: "IP67",
    title: "Pluie et poussière",
    text: "Résiste à la pluie et à la poussière (avec les câbles Starlink branchés), fonctionne de -30 °C à 50 °C.",
  },
  {
    big: "110°",
    title: "Large champ de vision",
    text: "Installation rapide : l'orientation assistée de l'app Starlink t'indique où pointer l'antenne.",
  },
];

const tips = [
  { t: "Un ciel dégagé", d: "Arbres, toits et tunnels coupent le signal. Place-toi à découvert dès que tu peux." },
  { t: "L'antenne orientée vers le ciel", d: "Garde le Mini à plat, face vers le haut, et suis l'orientation assistée de l'app Starlink." },
  { t: "Surveille la chauffe au soleil", d: "Ton iPhone chauffe plus vite en plein soleil, surtout en encodant. Garde-le à l'ombre et sans coque." },
  { t: "Teste avant l'événement", d: "Un live test la veille : connexion au Wi-Fi du Mini, bonding dans Moblin, image dans OBS." },
];

const settings = [
  { k: "Latence SRT", v: "2000 ms" },
  { k: "Bitrate adaptatif", v: "Activé" },
  { k: "Bitrate max", v: "6000 kbit/s" },
  { k: "Résolution", v: "1080p30" },
  { k: "Codec", v: "HEVC (H.265) si possible" },
];

export default function StarlinkPage() {
  return (
    <>
      {/* HERO : le Mini déborde du bas du hero sur la section suivante */}
      <section className="relative z-10 overflow-x-clip border-b border-line">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <Container className="relative grid items-center gap-10 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24">
          <div>
            <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-foreground">Accueil</Link>
                </li>
                <li aria-hidden="true" className="text-white/20">/</li>
                <li aria-current="page" className="text-foreground">Starlink</li>
              </ol>
            </nav>
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted">Starlink Mini × SYXTEE</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              Du live là où la 4G abandonne.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Le Starlink Mini dans ton sac, Moblin sur ton iPhone, et le bonding SRTLA qui combine satellite et réseau
              mobile.
            </p>
          </div>

          <div className="relative mx-auto h-64 w-64 sm:h-80 sm:w-80 lg:h-96 lg:w-full">
            <div className="absolute inset-x-0 -bottom-16 top-0 lg:-bottom-48 lg:top-12">
              <PopOutArt
                src="/images/starlink/mini.png"
                alt="Starlink Mini"
                fallback={<DishMini />}
                sizes="(min-width: 1024px) 480px, 320px"
                eager
              />
            </div>
          </div>
        </Container>
      </section>

      <section className="overflow-x-clip border-b border-line pb-20 pt-28 sm:pb-24 lg:pt-40">
        <Container>
          <SectionHeader kicker="Pourquoi le Mini" title="Pensé pour bouger." />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {specs.map((s) => (
              <article key={s.big} className="bg-black p-8 transition-colors hover:bg-neutral-950">
                <p className="font-mono text-3xl tracking-tight text-foreground sm:text-4xl">{s.big}</p>
                <h3 className="mt-6 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                {s.note && <p className="mt-3 font-mono text-xs leading-relaxed text-muted">{s.note}</p>}
              </article>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">
            Source :{" "}
            <a href={specSheetUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
              fiche technique officielle Starlink Mini
            </a>
          </p>
        </Container>
      </section>

      <section className="overflow-x-clip border-b border-line py-20 sm:py-24">
        <Container>
          <div className="max-w-2xl">
            <SectionHeader kicker="Comment ça s'intègre" title="Satellite et 4G, ensemble.">
              Moblin envoie ta vidéo à la fois sur le Wi-Fi du Mini et sur ta 4G/5G. Si le satellite est masqué par un
              arbre ou un bâtiment, la 4G prend le relais, et inversement.
            </SectionHeader>
          </div>
          <div className="mx-auto mt-14 max-w-5xl">
            <StarlinkDiagram />
          </div>
        </Container>
      </section>

      <section className="overflow-x-clip border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Le setup sac à dos" title="Tout tient dans un sac." />
          <div className="mt-24 space-y-28 md:mt-32 md:space-y-36">
            <PopOutImage src="/images/starlink/mini-sac.png" alt="Starlink Mini dans un sac à dos" side="left" overflow="side" fallback={<DishMini />}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Dans le sac</p>
              <p className="mt-4 text-xl font-medium leading-snug sm:text-2xl">
                Le Mini à plat vers le ciel, le câble et la powerbank.
              </p>
            </PopOutImage>
            <PopOutImage src="/images/starlink/mini-powerbank.png" alt="Starlink Mini branché sur une powerbank USB-C" side="right" overflow="side" fallback={<DishMini />}>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Alimentation</p>
              <p className="mt-4 text-xl font-medium leading-snug sm:text-2xl">
                Une powerbank USB-C PD 100 W suffit, pas de batterie V-mount nécessaire.
              </p>
            </PopOutImage>
          </div>
        </Container>
      </section>

      <section className="overflow-x-clip border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Conseils terrain" title="Avant de partir." />
          <ul className="divide-y divide-line border-y border-line">
            {tips.map((t) => (
              <li key={t.t} className="py-5">
                <p className="text-base font-medium">{t.t}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.d}</p>
              </li>
            ))}
            <li className="py-5">
              <p className="text-base font-medium">Le bon forfait</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Vérifie sur{" "}
                <a href={roamUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>starlink.com</a> que le
                forfait choisi permet l&apos;itinérance et l&apos;usage en mouvement.
              </p>
            </li>
          </ul>
        </Container>
      </section>

      <section className="overflow-x-clip border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Réglages" title="Réglages Moblin avec le Mini.">
            Une latence plus haute qu&apos;en 4G pure absorbe les micro-coupures du satellite.
          </SectionHeader>
          <table className="w-full self-start border-y border-line text-sm">
            <tbody className="divide-y divide-line">
              {settings.map((s) => (
                <tr key={s.k}>
                  <th scope="row" className="py-4 pr-4 text-left font-mono text-xs font-normal uppercase tracking-[0.1em] text-muted">
                    {s.k}
                  </th>
                  <td className="py-4 text-right text-foreground">{s.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Container>
      </section>

      <section className="overflow-x-clip py-20 sm:py-24">
        <Container>
          <div className="relative overflow-hidden rounded-3xl border border-line px-6 py-14 text-center sm:px-16">
            <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Forfaits</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Les prix changent souvent.</h2>
              <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted">
                On ne les affiche pas ici : consulte directement les forfaits à jour, et choisis-en un qui autorise
                l&apos;itinérance.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={roamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition-colors hover:bg-neutral-200"
                >
                  Voir les forfaits Starlink <span aria-hidden="true">↗</span>
                </a>
                <DiscordButton variant="ghost">Une question ? Discord</DiscordButton>
              </div>
            </div>
          </div>

          <p className="mt-12 text-xs text-muted">
            Starlink et Starlink Mini sont des marques de SpaceX. SYXTEE NETWORKS n&apos;est pas affilié à SpaceX. Visuels :
            photos SYXTEE NETWORKS.
          </p>
        </Container>
      </section>

      <NextStep label="Configurer Moblin" href="/moblin" />
    </>
  );
}
