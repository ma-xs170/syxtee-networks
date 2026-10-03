import Link from "next/link";
import { rich } from "@/lib/rich";
import Wordmark from "../Wordmark";
import { Container } from "../ui";
import Highlight from "../ui/Highlight";
import ChatDemo from "./ChatDemo";

// Accueil : Multichat, tous les chats du live dans un seul fil (page /dashboard/multichat).
const points = [
  { t: "Un seul fil", d: "**Twitch et Kick** se mélangent dans la même liste, chaque message avec l'icône de sa plateforme." },
  { t: "YouTube à côté", d: "Le chat de ton direct YouTube a son **onglet**, au même endroit." },
  { t: "Dans ton dashboard", d: "À côté de ton aperçu vidéo, ou sur sa **page dédiée**. Connexion avec Google, Twitch ou Discord." },
];

export default function MultichatPromo() {
  return (
    <section id="multichat" aria-labelledby="multichat-titre" className="border-b border-line py-24">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <figure className="order-2 lg:order-1">
          <ChatDemo />
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
