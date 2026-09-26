import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Figure from "@/components/Figure";
import NextStep from "@/components/NextStep";
import DetailSection, { Point } from "@/components/blocks/DetailSection";

export const metadata: Metadata = {
  title: "Moblin",
  description:
    "Moblin, l'app iPhone gratuite qu'on recommande pour l'IRL : pourquoi elle, comment la connecter au relais SRTLA SYXTEE et quels réglages utiliser.",
  alternates: { canonical: "/moblin" },
};

const setup = [
  "Installe Moblin depuis l'App Store (gratuit).",
  "Ouvre les réglages, puis la liste des streams, et crée un nouveau stream.",
  "Dans l'URL, colle l'adresse SRTLA qu'on te donne sur Discord.",
  "Active le bitrate adaptatif et vérifie que le Wi-Fi et le cellulaire sont autorisés pour le bonding.",
  "Sélectionne ce stream, appuie sur Go Live, puis vérifie que l'image arrive dans ton OBS.",
];

const settings = [
  { k: "Résolution", v: "1080p", note: "720p si ton téléphone chauffe" },
  { k: "Images/s", v: "30", note: "60 demande plus de bitrate et de batterie" },
  { k: "Codec", v: "H.265 (HEVC)", note: "Même qualité avec moins de data" },
  { k: "Bitrate max", v: "4 à 6 Mb/s", note: "À baisser si ton réseau est faible" },
  { k: "Bitrate adaptatif", v: "Activé", note: "Baisse la qualité au lieu de couper" },
];

const perks = [
  { t: "Gratuite et open source", d: "Pas d'abonnement, pas de filigrane. Le code est public et l'app évolue vite grâce à la communauté IRL." },
  { t: "SRTLA intégré", d: "Le bonding est natif : pas besoin d'app en plus pour combiner cellulaire et Wi-Fi." },
  { t: "Pensée pour la rue", d: "Stats réseau en direct, bitrate adaptatif, H.265 : tout ce qui compte quand tu bouges." },
];

export default function MoblinPage() {
  return (
    <>
      <PageHero kicker="Application" title="Moblin, l'app qu'on recommande." crumb="Moblin">
        Sur iPhone, Moblin transforme ton téléphone en encodeur IRL complet. C&apos;est l&apos;app qu&apos;on utilise et
        qu&apos;on conseille pour le relais SYXTEE.
      </PageHero>

      <DetailSection
        n="01"
        title="Pourquoi Moblin"
        visual={<Figure src="/photos/moblin-live.jpg" alt="écran de Moblin pendant un live IRL" caption="Moblin en live, avec les stats réseau à l'écran." ratio="4/5" />}
      >
        {perks.map((p) => (
          <Point key={p.t} label={p.t}>
            <p>{p.d}</p>
          </Point>
        ))}
      </DetailSection>

      <DetailSection
        n="02"
        title="Connecter Moblin au relais SYXTEE"
        reverse
        visual={
          <div className="rounded-2xl border border-line bg-white/[0.02] p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">URL du stream</p>
            <p className="mt-4 break-all rounded-xl border border-line bg-black p-4 font-mono text-sm">
              srtla://&lt;ADRESSE_RELAIS&gt;:&lt;PORT&gt;
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              L&apos;adresse exacte, le port et ton identifiant de stream te sont donnés sur le Discord quand ton accès est
              ouvert. Ne partage jamais ton identifiant : c&apos;est lui qui te réserve le flux.
            </p>
          </div>
        }
      >
        <Point label="En 5 étapes">
          <ol className="space-y-3">
            {setup.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="font-mono text-sm text-foreground">0{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Point>
        <Point label="Ta 2e connexion">
          <p>
            Sur iPhone, une seule ligne data est utilisée à la fois. Pour le bonding, ta deuxième connexion vient en
            général du Wi-Fi : le partage de connexion d&apos;un deuxième téléphone (idéalement chez un autre opérateur),
            un modem 4G/5G de poche ou une antenne{" "}
            <Link href="/starlink" className="text-foreground underline underline-offset-4">Starlink</Link>.
          </p>
        </Point>
      </DetailSection>

      <DetailSection n="03" title="Les réglages qu'on conseille">
        <Point label="Pour démarrer">
          <p>Ces valeurs marchent bien pour la majorité des lives IRL. Ajuste ensuite selon ton réseau et ton téléphone.</p>
        </Point>
        <dl className="divide-y divide-line border-y border-line">
          {settings.map((s) => (
            <div key={s.k} className="grid gap-1 py-4 sm:grid-cols-[10rem_8rem_1fr] sm:items-baseline sm:gap-6">
              <dt className="font-mono text-xs uppercase tracking-[0.1em] text-muted">{s.k}</dt>
              <dd className="text-sm font-medium">{s.v}</dd>
              <dd className="text-sm text-muted">{s.note}</dd>
            </div>
          ))}
        </dl>
        <Point label="Avant de sortir">
          <p>
            Fais toujours un test chez toi : lance le live sur Moblin, vérifie l&apos;image dans OBS, puis coupe le Wi-Fi
            pour voir le bonding prendre le relais. Cinq minutes de test t&apos;évitent de découvrir un souci en plein live.
          </p>
        </Point>
      </DetailSection>

      <DetailSection n="04" title="Et sur Android ?">
        <Point label="IRL Pro">
          <p>
            Moblin n&apos;existe que sur iPhone. Sur Android, utilise <strong>IRL Pro</strong> : il gère aussi le SRTLA et
            le bonding. Tu crées un profil de stream avec la même adresse SRTLA, et le reste (relais, OBS) ne change pas.
          </p>
        </Point>
      </DetailSection>

      <NextStep label="Starlink en IRL" href="/starlink" />
    </>
  );
}
