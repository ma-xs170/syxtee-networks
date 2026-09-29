import Link from "next/link";
import PhoneAndroid from "../illustrations/PhoneAndroid";
import Highlight from "../ui/Highlight";
import { site } from "@/lib/site";

// SYXTEE Cam en pause (FEATURE_CAM=false) : page d'attente sur /cam et /dashboard/cam.
export default function CamSoon({ scanner = true }: { scanner?: boolean }) {
  return (
    <div className="mx-auto grid min-h-[70dvh] w-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Bientôt disponible</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          SYXTEE <Highlight>Cam</Highlight>
        </h1>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-muted">Ton téléphone en caméra du direct, sans app à installer. On la peaufine avant de la rouvrir.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={site.discord}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.98]"
          >
            Rejoins le Discord pour être prévenu
          </a>
          {scanner && (
            <Link href="/dashboard/scanner" className="inline-flex h-11 items-center whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-white/5">
              Ouvrir le Scanner réseau
            </Link>
          )}
        </div>
      </div>
      <div className="mx-auto h-64 w-56 md:h-80 md:w-full">
        <PhoneAndroid screen="moblink" animated className="h-full w-full" />
      </div>
    </div>
  );
}
