import type { Metadata } from "next";
import FxImage from "@/components/landing/FxImage";
import Link from "next/link";
import type { ComponentType, CSSProperties } from "react";
import { Broadcast, Camera, Globe, type IconProps } from "@/components/icons";
import { Container } from "@/components/ui";
import { glow } from "@/lib/glow";

export const metadata: Metadata = {
  title: "Nos serveurs",
  description:
    "Ta caméra envoie son flux à nos serveurs, qui le stabilisent avant de le livrer à ton OBS. Les serveurs SYXTEE NETWORKS en ligne et la latence à prévoir.",
  alternates: { canonical: "/relais" },
};

type Step = { title: string; text: string; icon: ComponentType<IconProps> };
const STEPS: Step[] = [
  { title: "Ta caméra envoie", text: "4G, 5G et Wi-Fi en même temps.", icon: Camera },
  { title: "Nos serveurs stabilisent", text: "Les paquets perdus sont récupérés.", icon: Broadcast },
  { title: "Ton OBS reçoit", text: "Un flux propre, prêt à diffuser.", icon: Globe },
];

const WHITE = "inline-flex h-12 items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85";

export default function RelaisPage() {
  return (
    <>
      {/* 1. Hero */}
      <section data-hero data-theme="dark" className="relative isolate overflow-hidden border-b border-line bg-background text-foreground">
        {/* vraie photo de baies de serveurs, assombrie pour garder le titre lisible */}
        <div aria-hidden="true" className="absolute inset-0 -z-20 opacity-45"><FxImage src="/images/serveurs-baies.webp" sizes="100vw" priority /></div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/55 to-background" />
        <Container className="pb-24 pt-[calc(5rem+65px)] text-center lg:pb-32 lg:pt-[calc(7rem+65px)]">
          <h1 className="rise h-serif mx-auto max-w-[14ch] text-[clamp(2.75rem,6.5vw,5.5rem)]" style={{ "--i": 0 } as CSSProperties}>
            Ton flux, <em>stabilisé.</em>
          </h1>
          <p className="rise mx-auto mt-6 max-w-[40ch] text-lg leading-relaxed text-muted" style={{ "--i": 1 } as CSSProperties}>
            Il passe par nos serveurs avant ton OBS. Même sur un réseau mobile.
          </p>
          <div className="rise mt-9 flex justify-center" style={{ "--i": 2 } as CSSProperties}>
            <Link href="/inscription" className={WHITE}>Créer mon compte</Link>
          </div>
        </Container>
      </section>

      {/* 2. Le trajet, en trois colonnes */}
      <section className="border-t border-line py-24 sm:py-32">
        <Container>
          <h2 className="h-serif mx-auto max-w-3xl text-center text-[clamp(2.25rem,4.5vw,3.5rem)]">Le trajet de <em>ton flux.</em></h2>
          <ul className="mx-auto mt-16 grid max-w-5xl gap-x-12 gap-y-10 sm:grid-cols-3">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.title}>
                  <Icon size={26} weight="regular" className="text-foreground" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
                </li>
              );
            })}
          </ul>
          <p className="mx-auto mt-16 max-w-[44ch] text-center text-sm leading-relaxed text-muted">
            Choisis le serveur le plus proche de l&apos;endroit où tu filmes. En voyage, change avant le live.
          </p>
        </Container>
      </section>

      {/* 3. Hébergeur */}
      <section className="relative isolate overflow-hidden border-t border-line py-24 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={glow("#2b7fe0", "100% 50%", 60, 100, 30)} />
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div>
              <span role="img" aria-label="OVHcloud" className="block h-9 w-56 bg-foreground [mask:url(/images/ovhcloud-logo-blanc.png)_left_center/contain_no-repeat]" />
              <h2 className="h-serif mt-8 text-[clamp(2.25rem,4.5vw,3.5rem)]">Hébergés chez <em>OVHcloud.</em></h2>
              <p className="mt-5 max-w-[36ch] text-lg leading-relaxed text-muted">Des serveurs fiables, pensés pour le direct.</p>
            </div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-line">
              <FxImage src="/images/hebergeur-ovh.webp" alt="Bâtiment OVHcloud" sizes="(min-width:1024px) 55vw, 100vw" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
