import Link from "next/link";
import { siKick, siTwitch, siYoutube } from "simple-icons";
import { rich } from "@/lib/rich";
import Wordmark from "../Wordmark";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";

// Accueil : Multichat, tous les chats du live dans un seul fil (page /dashboard/multichat).
const points = [
  { t: "Un seul fil", d: "**Twitch et Kick** se mélangent dans la même liste, chaque message avec l'icône de sa plateforme." },
  { t: "YouTube à côté", d: "Le chat de ton direct YouTube a son **onglet**, au même endroit." },
  { t: "Dans ton dashboard", d: "Sous ton aperçu vidéo, ou sur sa **page dédiée**. Connexion avec Google, Twitch ou Discord." },
];

const icons = { twitch: siTwitch, kick: siKick, youtube: siYoutube };

// Exemple de messages, pour montrer le rendu (aucun vrai chat).
const sample: { p: "twitch" | "kick"; user: string; text: string }[] = [
  { p: "twitch", user: "Maëlys", text: "le signal tient bien dans le tunnel" },
  { p: "kick", user: "tonton_fibre", text: "quelle ville ce soir ?" },
  { p: "twitch", user: "Rayan_IRL", text: "salut tout le monde" },
  { p: "kick", user: "Noé", text: "la 5G passe nickel ici" },
  { p: "twitch", user: "Capucine", text: "on peut avoir le débit à l'écran ?" },
];

function PlatformIcon({ p, size = 14 }: { p: keyof typeof icons; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" className="shrink-0">
      <path d={icons[p].path} />
    </svg>
  );
}

export default function MultichatPromo() {
  return (
    <section id="multichat" aria-labelledby="multichat-titre" className="border-b border-line py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <figure className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3 text-sm">
              <span className="rounded-md bg-accent px-3 py-1 text-on-accent">Tout</span>
              <span className="text-muted">YouTube</span>
              <span className="ml-auto flex items-center gap-3 text-muted">
                <PlatformIcon p="twitch" />
                <PlatformIcon p="kick" />
                <PlatformIcon p="youtube" />
              </span>
            </div>
            <ul className="space-y-2.5 p-4 text-sm">
              {sample.map((m) => (
                <li key={m.user} className="flex items-baseline gap-2">
                  <span className="text-muted">
                    <PlatformIcon p={m.p} size={13} />
                  </span>
                  <span>
                    <span className="font-semibold">{m.user}</span>
                    <span className="text-muted">: {m.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="mt-3 text-xs text-muted">Exemple de messages.</figcaption>
        </figure>

        <div className="order-1 lg:order-2">
          <Wordmark name="MULTICHAT" />
          <h2 id="multichat-titre" className="h-section mt-5">
            <Highlight>Tous tes chats, un seul fil.</Highlight>
          </h2>
          <ul className="mt-8 space-y-5">
            {points.map((p) => (
              <li key={p.t}>
                <p className="text-base font-medium">{p.t}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{rich(p.d)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link href="/dashboard/multichat" className="btn btn-primary">
              Ouvrir le multichat
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
