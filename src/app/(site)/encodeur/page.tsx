import type { Metadata } from "next";
import Anywhere from "@/components/encoder/Anywhere";
import EncoderDashboardDemo from "@/components/encoder/EncoderDashboardDemo";
import Glow from "@/components/landing/Glow";
import RelayBox from "@/components/landing/RelayBox";
import VisualSlot from "@/components/landing/VisualSlot";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";
import GlassIcon from "@/components/ui/GlassIcon";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import SectionHeader from "@/components/ui/SectionHeader";
import StatusPill from "@/components/ui/StatusPill";
import WordsReveal from "@/components/ui/WordsReveal";
import { ctaLabel, product } from "@/config/product";
import { deviceImage } from "@/lib/device-images";

export const metadata: Metadata = {
  title: "Encodeur",
  description: "SYXTEE Encodeur, à venir : un boîtier à petit prix où tu branches ta caméra en HDMI. Il diffuse ton direct en 4G, 5G et satellite, sur terre, en mer ou en hélicoptère.",
  alternates: { canonical: "/encodeur" },
};

const steps = [
  { n: "01", title: "Branche ta caméra en HDMI", text: "Un câble HDMI de ta caméra vers le boîtier. Pas de téléphone au milieu, pas d'application à lancer." },
  { n: "02", title: "Ajoute tes connexions", text: "4G ou 5G avec ta carte SIM, Wi-Fi, ou un terminal satellite en Ethernet. Une clé 4G USB de plus ajoute une connexion." },
  { n: "03", title: "Il les réunit en une seule", text: "L'Encodeur envoie ta vidéo par toutes les connexions à la fois, vers un serveur SYXTEE. Si l'une lâche, les autres prennent le relais." },
  { n: "04", title: "Ton direct arrive en ligne", text: "Le serveur remet le flux en ordre et le diffuse vers YouTube, Twitch ou Kick. L'écran du boîtier te montre l'état en temps réel." },
];

const bento = [
  { icon: "relay" as const, title: "Bonding en direct", text: "Coupe une connexion : le débit, la latence et le graphique réagissent tout de suite, et les autres connexions compensent." },
  { icon: "health" as const, title: "Slate automatique", text: "Si tout lâche, une mire s'affiche pour tes viewers et le direct reprend dès que le réseau revient." },
  { icon: "obs-cloud" as const, title: "Mises à jour à distance", text: "Le firmware se met à jour depuis le tableau de bord, sans rien brancher ni redémarrer à la main." },
];

export default function EncodeurPage() {
  const { specs } = product;
  const rows: [string, string][] = [
    ["Connexions simultanées", `${specs.simultaneous} : Wi-Fi, Ethernet, 4G ou 5G`],
    ["Clé 4G USB", "Une connexion de plus par clé"],
    ["Ethernet", "Pour brancher un terminal satellite"],
    ["Caméra", "Entrée HDMI, 1080p60"],
    ["Écran", "Sur le boîtier : débit, connexions, batterie"],
    ["Interface", "Température, processeur, carte graphique, mémoire, audio, débit"],
    ["Gravure", "SYXTEE NETWORKS"],
  ];
  return (
    <>
      <Glow />
      {/* Présentation */}
      <section data-theme="dark" id="presentation" className="relative bg-background text-foreground -mt-[4.0625rem] scroll-mt-20 overflow-hidden border-b border-line pb-20 pt-[8.5rem] sm:pb-28 sm:pt-[9.5rem]">
        <CloudBackdrop />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <StatusPill variant="dev" label="À VENIR" />
            <h1 className="h-serif mx-auto mt-8 text-[clamp(3rem,8vw,5.5rem)]">
              <WordsReveal text="SYXTEE Encodeur." em={["Encodeur."]} />
            </h1>
            <p className="mx-auto mt-6 max-w-[560px] text-lg leading-relaxed text-foreground/85">{product.tagline}</p>
            <p className="mx-auto mt-4 max-w-[560px] text-base leading-relaxed text-muted">{product.pitch}</p>
          </div>
          <div className="mx-auto mt-14 max-w-4xl opacity-95">
            <VisualSlot name="encoder-hero" fallback={<RelayBox />} />
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-[1.3fr_1fr]">
            <dl className="bento-cell divide-y divide-line p-6 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 py-3 first:pt-0 last:pb-0">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="bento-cell flex flex-col justify-between p-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Prix</p>
                <p className="mt-2 font-mono text-4xl font-medium tabular-nums tracking-tight">{product.priceLabel(product.price)}</p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">À venir</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">Le principe des boîtiers de télévision comme le TVU, pensé pour les streamers, à un prix accessible. Le tarif sera annoncé à la sortie.</p>
                <p className="mt-4 rounded-xl border border-line bg-background/60 px-4 py-3 text-sm leading-relaxed">
                  <span className="font-medium">{product.bonusMonths} mois offerts</span> de l&apos;abonnement le plus élevé à l&apos;activation de ton Encodeur sur ton compte.
                </p>
              </div>
              <div className="mt-6 grid gap-2">
                <ButtonLink href="/acces" className="w-full">{ctaLabel(product.availability)}</ButtonLink>
                <ButtonLink href="/encodeur#interface" variant="secondary" className="w-full">Voir l&apos;interface</ButtonLink>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-xs text-muted">Caractéristiques indicatives, susceptibles d&apos;évoluer avant la sortie.</p>
        </Container>
      </section>

      {/* Fonctionnement */}
      <section id="fonctionnement" className="scroll-mt-20 border-b border-line py-24 sm:py-32">
        <Container>
          <SectionHeader icon="relay" title={<>Comment ça <em>marche.</em></>} subtitle="Le principe d'un boîtier de télévision comme le TVU : une caméra en HDMI, plusieurs réseaux, un seul direct stable. Version accessible, pour les créateurs." />
          <ol className="mt-16 grid gap-4 md:grid-cols-2">
            {steps.map((st) => (
              <li key={st.n} className="bento-cell flex flex-col p-7">
                <span className="font-mono text-xs tracking-[0.08em] text-muted">{st.n}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{st.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{st.text}</p>
              </li>
            ))}
          </ol>
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted">Tout est affiché sur l&apos;écran du boîtier, et dans ton tableau de bord depuis ton téléphone ou ton ordinateur.</p>
        </Container>
      </section>

      {/* Partout */}
      <section id="partout" className="scroll-mt-20 border-b border-line py-24 sm:py-32">
        <Container>
          <SectionHeader icon="health" title={<>Il marche <em>n&apos;importe où.</em></>} subtitle="Le boîtier diffuse dès qu'il capte un réseau mobile ou un ciel dégagé pour le satellite. Pas besoin de Wi-Fi, ni de câble, ni d'installation." />
          <Anywhere />
          <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-muted">Sur un bateau ou dans un hélicoptère, branche un terminal satellite en Ethernet : l&apos;Encodeur prend le relais quand la 4G et la 5G s&apos;arrêtent.</p>
        </Container>
      </section>

      {/* Livraison */}
      <section id="livraison" className="scroll-mt-20 border-b border-line py-20 sm:py-24">
        <Container>
          <div className="bento-cell mx-auto max-w-3xl p-8 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Livraison</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-x-8 gap-y-3 text-base">
              {product.shipping.map((c) => (
                <li key={c.cc} className="flex items-center gap-2"><span aria-hidden="true" className="text-2xl">{c.flag}</span>{c.name}</li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-muted">Livraison uniquement dans ces quatre territoires.</p>
          </div>
        </Container>
      </section>

      {/* Interface : démo du tableau de bord */}
      <section id="interface" className="scroll-mt-20 py-24 sm:py-32">
        <Container>
          <SectionHeader icon="health" title={<>Toute ta mobilité, dans un seul <em>tableau de bord.</em></>} subtitle="Branche ta caméra, suis chaque connexion et pilote ton direct. Essaie : tout est simulé, rien à installer." />
          <div className="mt-16">
            <EncoderDashboardDemo images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} />
          </div>
          <div className="mt-20 grid gap-4 md:grid-cols-3">
            {bento.map((b) => (
              <article key={b.title} className="bento-cell flex flex-col p-7">
                <GlassIcon name={b.icon} size={56} />
                <h3 className="mt-6 text-lg font-semibold tracking-tight">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{b.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
