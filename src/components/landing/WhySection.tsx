import Link from "next/link";
import { Container } from "../ui";
import Reveal from "../ui/Reveal";
import { deviceImage } from "@/lib/device-images";
import StreamPath from "./StreamPath";

const h2 = "h-serif text-[clamp(2.25rem,4.5vw,3.5rem)]";
const lead = "mt-4 max-w-[60ch] text-base leading-relaxed text-muted";

const APPLE = "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

/* Moblin : l'app qu'on recommande pour envoyer son flux vers nos serveurs. */
export function WhySection() {
  return (
    <section id="pourquoi" className="scroll-mt-20 border-b border-line py-24 lg:py-36">
      <Container>
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Pour envoyer ton flux</p>
          <h2 className={`${h2} mt-3`}>L&apos;app qu&apos;on <em>recommande.</em></h2>
          <p className={lead}>Installe-la sur ton téléphone, branche-la à l&apos;un de nos serveurs : ton flux arrive dans OBS, prêt à être piloté.</p>
        </Reveal>
        <Reveal delay={0.1} className="bento-cell mt-12 grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[auto_1fr_auto] lg:gap-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/moblin/icon.png" alt="Logo de Moblin" width={120} height={120} className="size-24 rounded-[26px] border border-line shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] sm:size-[120px]" />
          <div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-foreground">L&apos;app qu&apos;on recommande</span>
              Développée par eerimoq · Gratuite et open source
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Moblin</h3>
            <p className="mt-3 max-w-[62ch] text-sm leading-relaxed text-muted">
              Moblin est l&apos;app d&apos;IRL qu&apos;on te conseille pour streamer depuis ton téléphone : sans abonnement ni filigrane, avec un code public. Elle envoie ta vidéo sur plusieurs connexions à la fois (4G, 5G, Wi-Fi) et se branche sur un de nos serveurs en quelques minutes.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/moblin" className="btn btn-primary">Connecter Moblin à un serveur</Link>
              <a href="https://apps.apple.com/app/id6466745933" target="_blank" rel="noopener noreferrer" aria-label="Télécharger Moblin sur l'App Store" className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-line-strong bg-foreground px-4 text-background transition-opacity hover:opacity-90">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d={APPLE} /></svg>
                <span className="text-left leading-none"><span className="block text-[9px] opacity-80">Télécharger sur l&apos;</span><span className="block text-[15px] font-semibold tracking-tight">App Store</span></span>
              </a>
            </div>
          </div>
          <ul className="grid gap-3 text-sm lg:w-56">
            {["Envoi SRTLA multi-connexions", "Vidéo jusqu'en 4K60", "Compatible Apple Watch"].map((x) => (
              <li key={x} className="flex gap-2.5 text-muted"><span aria-hidden="true" className="text-foreground">+</span>{x}</li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="mt-16 border-t border-line pt-12">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">Le trajet de ton flux</p>
          <p className={lead}>Ton flux part de ton téléphone, arrive dans nos serveurs, puis sur ton OBS. Tu y ajoutes tes scènes comme d&apos;habitude.</p>
          <div className="mt-10"><StreamPath images={{ laptop: deviceImage("laptop"), phone: deviceImage("phone") }} /></div>
        </Reveal>
      </Container>
    </section>
  );
}
