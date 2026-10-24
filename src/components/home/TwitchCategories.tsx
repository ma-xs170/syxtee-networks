import Link from "next/link";
import { VideoCamera } from "@phosphor-icons/react/dist/ssr";
import BeachView from "@/components/illustrations/BeachView";
import HomeDesk from "@/components/illustrations/HomeDesk";
import Streamer from "@/components/illustrations/Streamer";
import StreamerDesk from "@/components/illustrations/StreamerDesk";
import { Container } from "@/components/ui";
import { ButtonLink } from "@/components/ui/Button";

// Accueil : catégories Twitch couvertes par les directs SYXTEE. Cartes inclinées façon polaroïd (illustrations fil de fer, pas de photos),
// à plat sur mobile. Fond violet Twitch, comme « Ils nous font confiance ».

const CATEGORIES = [
  { title: "IRL", text: "Le direct en mobilité", Art: Streamer, tilt: "lg:-rotate-6 lg:translate-y-6" },
  { title: "Travel & Outdoors", text: "Mer, plage et grands espaces", Art: BeachView, tilt: "lg:rotate-3" },
  { title: "Just Chatting", text: "Le direct qui discute", Art: StreamerDesk, tilt: "lg:-rotate-2 lg:translate-y-4" },
  { title: "Special Events", text: "Les événements en direct", Art: HomeDesk, tilt: "lg:rotate-6 lg:translate-y-8" },
] as const;

export default function TwitchCategories() {
  return (
    <section aria-labelledby="categories-titre" className="relative isolate overflow-hidden py-24 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(70% 55% at 50% 0%, color-mix(in srgb, #9146ff 34%, transparent), transparent 75%)" }} />
      <Container className="text-center">
        <VideoCamera size={52} weight="regular" aria-hidden="true" className="mx-auto mb-6 block" style={{ color: "#9146ff" }} />
        <h2 id="categories-titre" className="h-section">
          Catégories Twitch : IRL.
        </h2>
        <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-foreground/85">Nos équipes diffusent là où se trouvent les créateurs : en mobilité, en mer, en studio et sur les grands événements.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/contact" className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85">
            Contactez-nous <span aria-hidden="true">→</span>
          </Link>
          <ButtonLink href="/cas-d-usage" variant="secondary">Voir les cas d&apos;usage</ButtonLink>
        </div>
        <ul className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 lg:flex lg:items-start lg:justify-center lg:gap-0">
          {CATEGORIES.map(({ title, text, Art, tilt }) => (
            <li key={title} className={`rounded-2xl border border-line-strong bg-surface-2 p-3 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] lg:-mx-2 lg:w-60 ${tilt}`}>
              <div aria-hidden="true" className="flex aspect-[4/5] items-center justify-center rounded-xl border border-line bg-background p-5 text-foreground/80">
                <Art animated={false} className="h-full w-full" />
              </div>
              <p className="mt-3 px-1 font-semibold tracking-tight">{title}</p>
              <p className="px-1 pb-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
