import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "RIST",
  description:
    "Le protocole RIST sur SYXTEE : ce que c'est, quand le choisir face à SRTLA et RTMP, et comment envoyer ton flux RIST (Moblin, encodeur, FFmpeg) vers ton relais, chiffré en AES-256.",
  alternates: { canonical: "/docs/rist" },
};

const steps = [
  "Crée un relais RIST dans Mes relais : choisis RIST à l'étape Protocole. Le relais reçoit son propre port UDP et un secret de chiffrement.",
  "Copie l'URL RIST complète (elle contient l'adresse, le port, le secret et le chiffrement AES-256).",
  "Dans Moblin : Réglages, Streams, ton stream, puis colle l'URL RIST. Dans un encodeur ou un logiciel qui a des champs séparés, utilise l'adresse, le port et le secret affichés.",
  "Lance le direct : le relais passe « En direct ». OBS lit ton relais en SRT, comme pour SRTLA et RTMP.",
];

const compare = [
  { name: "SRTLA", text: "Bonding : combine 4G, 5G, Wi-Fi et Starlink. Le meilleur choix pour marcher en direct avec un téléphone.", pick: "IRL en mouvement" },
  { name: "RIST", text: "Une seule liaison, mais le récepteur redemande les paquets perdus (ARQ) et tout est chiffré en AES-256. Le standard des régies broadcast.", pick: "Encodeur pro, liaison stable, régie" },
  { name: "RTMP", text: "Le plus répandu : caméras DJI, GoPro, Insta360, OBS. Une seule liaison, pas de récupération de paquets.", pick: "Caméra d'action, Wi-Fi stable" },
];

export default function RistDocPage() {
  return (
    <>
      <PageHero kicker="Documentation" title="RIST." crumb="RIST">
        Le protocole des régies broadcast, ouvert à tous les streamers. Trois protocoles sur un seul relais : SRTLA, RTMP et RIST.
      </PageHero>
      <section className="border-b border-line py-16 sm:py-20">
        <Container className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Envoyer en RIST : étapes</h2>
            <ol className="mt-6 space-y-4">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-4 text-sm leading-relaxed">
                  <span className="font-mono text-xs text-muted">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">Secret :</span> il chiffre le flux (profil Main, AES-256). Sans lui, le relais rejette tout ce qui arrive.
              Si tu le partages par erreur, « Régénérer la clé » dans Mes relais en crée un nouveau et coupe l&apos;ancien émetteur.
            </p>
            <p className="mt-4 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">Pare-feu :</span> RIST passe en UDP, sur un port propre à ton relais (entre 6000 et 6199). Si ton réseau
              bloque l&apos;UDP, utilise SRTLA ou RTMP.
            </p>
            <p className="mt-4 rounded-2xl border border-line p-5 text-sm leading-relaxed text-muted">
              <span className="font-medium text-foreground">FFmpeg :</span> une build avec librist envoie directement :{" "}
              <code className="break-all font-mono text-xs text-foreground">ffmpeg -i entrée -c copy -f mpegts &quot;rist://hôte:port?secret=…&amp;aes-type=256&amp;profile=1&quot;</code>
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">SRTLA, RIST ou RTMP ?</h2>
            <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
              {compare.map((c) => (
                <li key={c.name} className="p-5">
                  <p className="flex items-center justify-between gap-3 text-sm font-medium">
                    {c.name}
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{c.pick}</span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{c.text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-muted">
              Quel que soit le protocole d&apos;entrée, le relais convertit le flux en SRT : OBS, la santé du flux, l&apos;aperçu et la mire fonctionnent pareil.{" "}
              <Link href="/moblin" className="text-foreground underline underline-offset-4">
                Voir le guide Moblin
              </Link>
              .
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
