import Link from "next/link";
import StudioWire from "../illustrations/StudioWire";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";

// Accueil : SYXTEE STUDIO, la régie de diffusion dans le navigateur (page /syxtee-studio, outil /studio).
const points = [
  { t: "Multiview de régie TV", d: "Aperçu, programme et toutes tes scènes en direct." },
  { t: "Secours automatique", d: "Il bascule seulement si l'image se fige, jamais pour un simple bas débit." },
  { t: "Mode podcast", d: "Flux synchronisés, même en latence haute, et scène qui suit la voix." },
];

export default function StudioPromo() {
  return (
    <section id="studio" aria-labelledby="studio-titre" className="bg-field border-b border-line py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <p className="label-mono inline-flex rounded-full border border-line px-3 py-1">Nouveau</p>
          <h2 id="studio-titre" className="h-section mt-5">
            SYXTEE STUDIO, ta régie <Highlight>sans OBS.</Highlight>
          </h2>
          <ul className="mt-8 space-y-5">
            {points.map((p) => (
              <li key={p.t}>
                <p className="text-base font-medium">{p.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/syxtee-studio" className="btn btn-primary">
              Découvrir le studio
            </Link>
            <Link href="/studio" className="btn btn-secondary">
              Ouvrir le studio
            </Link>
          </div>
        </div>
        <div className="panel-lg p-4 sm:p-6">
          <StudioWire className="h-auto w-full" />
        </div>
      </Container>
    </section>
  );
}
