import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { DJI_MODELS } from "@/lib/dji/protocol";

export const metadata: Metadata = {
  title: "Caméras externes",
  description: "Connecter une caméra DJI (Bluetooth), une GoPro ou un drone DJI (RTMP) et les faire diffuser vers ton relais RTMP SYXTEE.",
  alternates: { canonical: "/docs/dji" },
};

// Modèles validés sur une vraie caméra avec la page « Configurer une DJI ». Les autres : protocole de Moblin, non testés ici.
const TESTED: string[] = ["osmoPocket3"]; // Osmo Pocket 3 : validée le 30/09/2026 (Android, Chrome).

const steps = [
  "Crée un relais RTMP par caméra dans Mes relais (un relais = un flux).",
  "Dashboard, Direct, Caméras externes, onglet Ajouter, marque DJI. Allume la caméra et son Bluetooth, puis « Rechercher ma caméra ». À la première connexion, valide la demande sur l'écran de la caméra.",
  "Indique le réseau que la caméra utilisera : le partage de connexion de ton téléphone (nom et mot de passe), ou un Wi-Fi. Il est gardé pour les caméras suivantes.",
  "Choisis le relais et la qualité : 720p et 2 Mb/s conviennent à une 4G moyenne.",
  "« Enregistrer et lancer le direct » : la caméra rejoint le réseau et diffuse. Tu peux fermer la page, elle continue. Les stats en direct s'affichent en haut de Caméras externes.",
];

const droneSteps = [
  "Crée un relais RTMP par drone dans Mes relais (un relais = un flux).",
  "Dashboard, Direct, Caméras externes, onglet Ajouter, marque Drone DJI. Choisis le modèle et le relais : l'adresse RTMP s'affiche, avec un bouton Copier.",
  "Dans DJI Fly, ouvre la transmission en direct et choisis le RTMP personnalisé. Colle l'adresse copiée.",
  "Donne Internet à la radiocommande : le partage de connexion de ton téléphone ou un Wi-Fi.",
  "Lance la transmission : le relais passe « En direct » dans la page Caméras externes. Vérifie que ton modèle propose le RTMP dans DJI Fly.",
];

const goproSteps = [
  "Crée un relais RTMP par caméra dans Mes relais (un relais = un flux).",
  "Dashboard, Direct, Caméras externes, onglet Ajouter, marque GoPro. Choisis le modèle et le relais : l'adresse RTMP s'affiche, avec un bouton Copier.",
  "Dans l'app GoPro, connecte ta caméra, ouvre la diffusion en direct et choisis une URL RTMP personnalisée. Colle l'adresse copiée.",
  "Donne un réseau à la caméra : le partage de connexion de ton téléphone ou un Wi-Fi. Résolution conseillée : 720p ou 1080p.",
  "Lance la diffusion dans l'app GoPro : le relais passe « En direct » dans la page Caméras externes.",
];

export default function DjiDocPage() {
  return (
    <>
      <PageHero kicker="Documentation" title="Caméras externes." crumb="Caméras externes">
        DJI en Bluetooth, GoPro et drones DJI en RTMP : ta caméra diffuse directement vers ton relais SYXTEE.
      </PageHero>
      <section className="border-b border-line py-16 sm:py-20">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">DJI : étapes</h2>
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
            <p className="mt-4 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">Pas de bonding :</span> la caméra diffuse en RTMP sur un seul réseau à la fois, sans SRTLA.
              Pour combiner plusieurs connexions, branche la caméra en HDMI ou USB-C à un iPhone avec Moblin (bonding SRTLA), ou fais passer son Wi-Fi par un
              routeur multi-SIM comme{" "}
              <Link href="/pro" className="underline underline-offset-4 hover:text-foreground">
                SYXTEE PRO
              </Link>
              .
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">GoPro : étapes</h2>
            <ol className="mb-12 mt-6 space-y-4">
              {goproSteps.map((s, i) => (
                <li key={s} className="flex gap-4 text-sm leading-relaxed">
                  <span className="font-mono text-xs text-muted">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <h2 className="text-2xl font-semibold tracking-tight">Drone DJI : étapes</h2>
            <ol className="mb-12 mt-6 space-y-4">
              {droneSteps.map((s, i) => (
                <li key={s} className="flex gap-4 text-sm leading-relaxed">
                  <span className="font-mono text-xs text-muted">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <h2 className="text-2xl font-semibold tracking-tight">Modèles DJI</h2>
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
