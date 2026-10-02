import { rich } from "@/lib/rich";
import Link from "next/link";
import StudioWire from "../illustrations/StudioWire";
import Wordmark from "../Wordmark";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";

// Accueil : SYXTEE STUDIO, l'interface d'OBS sur le site, pilotée à distance via le plugin SYXTEE Link (page /syxtee-studio, outil /studio).
const points = [
  { t: "Ton OBS, à distance", d: "**Live, enregistrement, scènes et audio** : chaque bouton agit sur ton PC, depuis ton téléphone ou ton navigateur." },
  { t: "Scènes sauvegardées", d: "Tes scènes et leurs médias, **5 Go par compte**, restaurables sur n'importe quel PC." },
  { t: "Secours automatique", d: "Il bascule **seulement si l'image se fige**, jamais pour un simple bas débit. Le stream tourne sur ton ordinateur." },
];

export default function StudioPromo() {
  return (
    <section id="studio" aria-labelledby="studio-titre" className="bg-field border-b border-line py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <Wordmark name="STUDIO" />
          <h2 id="studio-titre" className="h-section mt-5">
            <Highlight>SYXTEE STUDIO, ton OBS partout.</Highlight>
          </h2>
          <ul className="mt-8 space-y-5">
            {points.map((p) => (
              <li key={p.t}>
                <p className="text-base font-medium">{p.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{rich(p.d)}</p>
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
