import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { siTwitch } from "@/lib/brand-icons";
import StreamerDesk from "@/components/illustrations/StreamerDesk";
import Reveal from "@/components/ui/Reveal";
import Highlight from "@/components/ui/Highlight";
import { Container } from "@/components/ui";
import { buttonClass } from "@/components/ui/button-styles";
import { getPublicAffiliate } from "@/lib/affiliates";
import { CATALOG, TIERS } from "@/lib/billing";
import { getTwitchUsersByLogin, hasTwitch } from "@/lib/twitch";

// Page publique d'un affilié : /s/<slug>. Elle donne envie de streamer « comme » lui, avec les formules du site.
// Le bouton passe par /api/affilie/go (compte le clic), puis ouvre l'inscription avec Twitch.
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getPublicAffiliate((await params).slug);
  if (!a) return { title: "Page introuvable", robots: { index: false } };
  return { title: `Streame comme ${a.displayName}`, description: `Rejoins ${a.displayName} sur SYXTEE NETWORKS : un direct stable, un OBS piloté à distance, depuis n'importe où.`, robots: { index: false, follow: true } };
}

const reasons = [
  { t: "Un direct qui ne coupe pas", d: "Serveurs SRTLA et RTMP, secours automatique : ton flux tient même quand le réseau faiblit." },
  { t: "Ton OBS dans la poche", d: "Change de scène, règle l'audio et lance le direct depuis ton téléphone, où que tu sois." },
  { t: "Zéro serveur à gérer", d: "Pas de machine à louer ni de réglages compliqués : tu te connectes, tu streames." },
];

export default async function AffiliatePage({ params }: Props) {
  const a = await getPublicAffiliate((await params).slug);
  if (!a) notFound();
  let avatar = a.avatar;
  if (!avatar && a.twitch && hasTwitch) avatar = (await getTwitchUsersByLogin([a.twitch]).catch(() => null))?.get(a.twitch.toLowerCase())?.profile_image_url ?? null;
  const go = `/api/affilie/go?s=${encodeURIComponent(a.slug)}`;
  const cta = `${buttonClass("primary")} !h-12 !px-7 !text-base`;
  const twitchIcon = (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="currentColor">
      <path d={siTwitch.path} />
    </svg>
  );

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <Container className="grid items-center gap-10 pb-16 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:pb-24 lg:pt-20">
          <div className="text-center lg:text-left">
            <div className="mb-6 flex items-center justify-center gap-3 lg:justify-start">
              {avatar ? (
                <Image src={avatar} alt="" width={96} height={96} className="size-16 rounded-full border-2 border-line-strong object-cover" priority />
              ) : (
                <span aria-hidden="true" className="grid size-16 place-items-center rounded-full border-2 border-line-strong font-mono text-xl uppercase">{a.displayName.slice(0, 1)}</span>
              )}
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Recommandé par {a.displayName}</span>
            </div>
            <h1 className="h-serif max-w-[16ch] text-[clamp(2.5rem,6vw,4.5rem)] max-lg:mx-auto">
              Streamez dès maintenant comme <Highlight>{a.displayName}</Highlight>
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted max-lg:mx-auto">
              Le même outillage que {a.displayName} pour diffuser sur Twitch : un direct stable, ton OBS piloté à distance, depuis n&apos;importe où.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start max-lg:justify-center">
              <a href={go} className={cta}>
                {twitchIcon}
                Commencer avec Twitch
              </a>
              <a href="#formules" className={buttonClass("secondary", "!h-12")}>Voir les formules</a>
            </div>
          </div>
          <div aria-hidden="true" className="mx-auto w-full max-w-md lg:max-w-none">
            <StreamerDesk className="h-auto w-full" />
          </div>
        </Container>
      </section>

      <section className="border-b border-line py-20 lg:py-28">
        <Container>
          <Reveal>
            <h2 className="h-serif text-[clamp(2rem,4vw,3.25rem)]">Pourquoi {a.displayName} <em>diffuse avec SYXTEE.</em></h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {reasons.map((r, i) => (
              <Reveal as="article" delay={i * 0.08} key={r.t} className="bento-cell p-6">
                <p className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-tight">{r.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{r.d}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section id="formules" className="scroll-mt-24 border-b border-line py-20 lg:py-28">
        <Container>
          <Reveal>
            <h2 className="h-serif text-[clamp(2rem,4vw,3.25rem)]">Choisis ta <em>formule.</em></h2>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-muted">Sans engagement : tu changes ou tu arrêtes quand tu veux.</p>
          </Reveal>
          <div className="mt-10 grid items-stretch gap-4 md:grid-cols-3">
            {TIERS.map((t, k) => {
              const c = CATALOG[t];
              return (
                <Reveal as="article" delay={k * 0.08} key={t} className={`bento-cell flex flex-col p-6 ${c.featured ? "!border-line-strong bg-surface-2" : ""}`}>
                  <h3 className="text-xl font-semibold tracking-tight">{c.name}</h3>
                  <p className="mt-1 min-h-10 text-sm text-muted">{c.pitch}</p>
                  <p className="mt-5 text-4xl font-semibold tracking-tight">{c.prices.month.amount}<span className="ml-1.5 text-sm font-normal text-muted">par mois</span></p>
                  <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                    {c.points.slice(0, 4).map((x) => (
                      <li key={x} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
                    ))}
                  </ul>
                  <a href={go} className={buttonClass(c.featured ? "primary" : "secondary", "mt-6 w-full")}>Commencer avec {c.name}</a>
                </Reveal>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-muted">TVA non applicable, article 293 B du CGI.</p>
        </Container>
      </section>

      <section className="py-20 text-center lg:py-28">
        <Container>
          <h2 className="h-serif mx-auto max-w-[20ch] text-[clamp(2rem,4vw,3.25rem)]">Prêt à streamer comme <em>{a.displayName} ?</em></h2>
          <div className="mt-8 flex justify-center">
            <a href={go} className={cta}>
              {twitchIcon}
              Commencer avec Twitch
            </a>
          </div>
        </Container>
      </section>
    </>
  );
}
