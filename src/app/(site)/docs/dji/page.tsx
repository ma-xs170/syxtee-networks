import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { DJI_MODELS } from "@/lib/dji/protocol";

export const metadata: Metadata = {
  title: "Caméras DJI",
  description: "Connecter une caméra DJI (Osmo Pocket, Osmo Action, Osmo 360) en Bluetooth et la faire diffuser vers ton relais RTMP SYXTEE.",
  alternates: { canonical: "/docs/dji" },
};

// Modèles validés sur une vraie caméra avec la page « Configurer une DJI ». Les autres : protocole de Moblin, non testés ici.
const TESTED: string[] = [];

const steps = [
  "Crée un relais RTMP dans Mes relais, puis ouvre-le et choisis « Configurer une DJI ».",
  "Allume la caméra, active son Bluetooth, puis « Rechercher ma caméra ». À la première connexion, valide la demande sur l'écran de la caméra.",
  "Indique le réseau que la caméra utilisera : le partage de connexion de ton téléphone (nom et mot de passe), ou un Wi-Fi.",
  "Choisis la qualité : 720p et 2 Mb/s conviennent à une 4G moyenne.",
  "« Lancer le direct » : la caméra rejoint le réseau et diffuse vers ton relais. Dans OBS, rien ne change : même URL SRT que d'habitude.",
];

export default function DjiDocPage() {
  return (
    <>
      <PageHero kicker="Documentation" title="Caméras DJI en Bluetooth." crumb="Caméras DJI">
        Ta caméra diffuse directement vers ton relais SYXTEE, sans l&apos;app DJI Mimo.
      </PageHero>
      <section className="border-b border-line py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Étapes</h2>
            <ol className="mt-6 space-y-4">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-4 text-sm leading-relaxed">
                  <span className="font-mono text-xs text-muted">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">Attention :</span> le Bluetooth web marche sur Android (Chrome) et sur ordinateur (Chrome, Edge),
              pas sur iPhone. Sur iPhone, utilise Moblin pour configurer ta DJI, ou l&apos;app SYXTEE (bientôt).
            </p>
            <p className="mt-4 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">Astuce :</span> coche « Mémoriser sur ce téléphone » : la fois suivante, un seul bouton
              « Relancer le direct ». Le mot de passe Wi-Fi reste dans ton navigateur, il n&apos;est jamais envoyé à SYXTEE.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Modèles</h2>
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {DJI_MODELS.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                  <span>{m.name}</span>
                  <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{TESTED.includes(m.id) ? "Testé" : "Non testé"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Protocole Bluetooth rétro-ingénié par le projet Moblin (licence MIT, Erik Moqvist). « Non testé » : pas encore validé sur une vraie caméra avec
              SYXTEE.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
