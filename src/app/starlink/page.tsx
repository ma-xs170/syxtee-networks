import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Figure from "@/components/Figure";
import NextStep from "@/components/NextStep";
import StarlinkDiagram from "@/components/blocks/StarlinkDiagram";
import { Container, SectionHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Starlink en IRL",
  description:
    "Starlink + SYXTEE : combine l'internet satellite avec ta 4G/5G grâce au bonding SRTLA pour streamer en IRL même en zone blanche ou dans un événement saturé.",
  alternates: { canonical: "/starlink" },
};

const starlinkUrl = "https://www.starlink.com";

const reasons = [
  {
    n: "01",
    title: "Les zones blanches",
    text: "Plage, montagne, mer, campagne : là où la 4G n'a qu'une barre ou rien du tout, l'antenne capte par satellite tant qu'elle voit le ciel.",
  },
  {
    n: "02",
    title: "Les événements saturés",
    text: "Concert, festival, stade : quand des milliers de téléphones partagent la même antenne 4G, le réseau s'effondre. Le satellite, lui, ne passe pas par l'antenne du coin.",
  },
  {
    n: "03",
    title: "En complément, pas forcément en remplacement",
    text: "Starlink devient une connexion de plus dans ton bonding. Quand le ciel est bouché, ta 4G/5G prend le relais, et inversement.",
  },
];

const gallery = [
  { src: "/images/starlink/antenne.jpg", alt: "antenne Starlink Mini", caption: "L'antenne" },
  { src: "/images/starlink/alimentation.jpg", alt: "batterie USB-C qui alimente l'antenne", caption: "Alimentation / batterie" },
  { src: "/images/starlink/montage.jpg", alt: "antenne fixée sur un sac à dos ou une perche", caption: "Montage sac ou perche" },
  { src: "/images/starlink/setup-complet.jpg", alt: "setup complet Starlink et téléphone en live", caption: "Setup complet en live" },
];

const phoneSettings = [
  { k: "Bitrate max", v: "6000 kbit/s", note: "Baisse-le si le débit montant de ton antenne est faible." },
  { k: "Latence SRT", v: "2000 ms", note: "Plus haute qu'en 4G pure, pour absorber les micro-coupures du signal satellite." },
  { k: "Bitrate adaptatif", v: "Activé", note: "Moblin baisse la qualité au lieu de couper quand le signal faiblit." },
];

// Profil OBS SYXTEE (mode Avancé), repris tel quel.
const obsSettings = [
  { k: "Encodeur", v: "Apple VT H264 Hardware" },
  { k: "Résolution", v: "1920 × 1080" },
  { k: "Images/s", v: "60" },
  { k: "Débit vidéo", v: "5500 kbit/s" },
  { k: "Image clé", v: "toutes les 1 s" },
  { k: "Audio", v: "AAC 160 kbit/s" },
];

export default function StarlinkPage() {
  return (
    <>
      <PageHero kicker="Connexion satellite" title="Starlink + SYXTEE : du live même sans réseau mobile." crumb="Starlink">
        Combine l&apos;internet satellite avec ta 4G/5G grâce au bonding SRTLA, et garde ton live debout là où le réseau
        mobile ne suit plus.
      </PageHero>

      <section className="border-b border-line py-12 sm:py-16">
        <Container>
          <Figure
            src="/images/starlink/hero.jpg"
            alt="Antenne Starlink Mini sur le terrain"
            caption="Antenne Starlink Mini sur le terrain"
            ratio="21/9"
            sizes="(min-width: 1152px) 1104px, 100vw"
            eager
          />
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Pourquoi" title="Pourquoi Starlink en IRL." />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
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
          <div className="max-w-2xl">
            <SectionHeader kicker="Intégration" title="Comment ça s'intègre." />
            <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
              <p>
                L&apos;antenne crée son propre réseau <strong className="font-medium text-foreground">Wi-Fi</strong>. Ton
                iPhone s&apos;y connecte comme à n&apos;importe quelle box, en gardant ses données cellulaires activées.
              </p>
              <p>
                <Link href="/moblin" className="text-foreground underline underline-offset-4">Moblin</Link> combine alors
                ce Wi-Fi avec ton réseau mobile en bonding SRTLA. Le relais SYXTEE recolle les deux et envoie un seul flux
                SRT à ton OBS. Côté relais et OBS, rien ne change.
              </p>
            </div>
          </div>
          <div className="mx-auto mt-14 max-w-4xl">
            <StarlinkDiagram />
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Matériel" title="Le setup." />
          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {gallery.map((g) => (
              <Figure key={g.src} src={g.src} alt={g.alt} caption={g.caption} ratio="4/3" sizes="(min-width: 1152px) 544px, (min-width: 768px) 50vw, 100vw" />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeader kicker="Terrain" title="Conseils terrain." />
          <ul className="divide-y divide-line border-y border-line">
            <li className="py-5">
              <p className="text-base font-medium">Un ciel dégagé</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                L&apos;antenne doit voir le ciel. Les arbres, les bâtiments, les tunnels et les parkings couverts bloquent
                le signal : place-la à découvert, tournée vers le ciel.
              </p>
            </li>
            <li className="py-5">
              <p className="text-base font-medium">Une batterie USB-C PD assez puissante</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                L&apos;antenne consomme bien plus qu&apos;un téléphone. Prévois une batterie USB-C Power Delivery capable de
                fournir la puissance demandée : consommation et puissance requise sur le{" "}
                <a href={starlinkUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                  site officiel Starlink
                </a>
                .
              </p>
            </li>
            <li className="py-5">
              <p className="text-base font-medium">Attention au mouvement rapide</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Selon le modèle et le forfait, l&apos;antenne ne capte pas bien en mouvement rapide (voiture, vélo). En
                marchant, garde-la stable et à plat.
              </p>
            </li>
            <li className="py-5">
              <p className="text-base font-medium">Un forfait adapté à l&apos;itinérance</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Tous les forfaits ne permettent pas d&apos;utiliser l&apos;antenne partout. Vérifie celui qui couvre
                l&apos;usage nomade et les pays où tu streames. Forfaits et prix : voir le{" "}
                <a href={starlinkUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                  site officiel Starlink
                </a>
                .
              </p>
            </li>
          </ul>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeader kicker="Réglages" title="Réglages recommandés.">
            Starlink ne change que le trajet entre ton téléphone et le relais. C&apos;est donc côté Moblin qu&apos;on
            ajuste.
          </SectionHeader>

          <div className="mt-14 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Dans Moblin</p>
              <table className="mt-6 w-full border-y border-line text-sm">
                <tbody className="divide-y divide-line">
                  {phoneSettings.map((s) => (
                    <tr key={s.k} className="align-top">
                      <th scope="row" className="py-4 pr-4 text-left font-mono text-xs font-normal uppercase tracking-[0.1em] text-muted">
                        {s.k}
                      </th>
                      <td className="py-4">
                        <p className="font-medium text-foreground">{s.v}</p>
                        <p className="mt-1 text-muted">{s.note}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-2xl border border-line p-6 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Dans OBS · rien à changer</p>
              <table className="mt-6 w-full border-y border-line text-sm">
                <tbody className="divide-y divide-line">
                  {obsSettings.map((s) => (
                    <tr key={s.k}>
                      <th scope="row" className="py-3 pr-4 text-left font-mono text-xs font-normal uppercase tracking-[0.1em] text-muted">
                        {s.k}
                      </th>
                      <td className="py-3 text-right text-foreground">{s.v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                OBS envoie vers Twitch, Kick ou YouTube depuis ta connexion fixe. L&apos;encodeur matériel Apple VT H264
                est déjà le bon choix : pas besoin de le modifier pour tes lives Starlink.
              </p>
            </div>
          </div>

          <p className="mt-12 text-xs text-muted">
            Starlink est une marque de SpaceX. SYXTEE NETWORKS n&apos;est pas affilié à SpaceX.
          </p>
        </Container>
      </section>

      <NextStep label="Choisir ton relais" href="/relais" />
    </>
  );
}
