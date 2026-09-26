import Link from "next/link";
import { Container } from "../ui";

const guides = [
  {
    href: "/moblin",
    kicker: "Application",
    title: "Moblin, l'app qu'on recommande",
    text: "Gratuite sur iPhone, pensée pour l'IRL et compatible SRTLA. Ce qu'elle fait, et comment la brancher sur le relais.",
  },
  {
    href: "/starlink",
    kicker: "Connexion",
    title: "Starlink en IRL",
    text: "Quand la 4G ne suffit plus : streamer depuis la campagne, la mer ou un festival saturé avec une antenne satellite.",
  },
];

export default function Guides() {
  return (
    <section className="border-b border-line py-24">
      <Container className="grid gap-4 md:grid-cols-2">
        {guides.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group flex flex-col justify-between rounded-2xl border border-line p-8 transition-colors hover:bg-white/[0.03]"
          >
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{g.kicker}</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{g.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{g.text}</p>
            </div>
            <p className="mt-10 text-sm text-muted transition-colors group-hover:text-foreground">
              Lire le guide <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
            </p>
          </Link>
        ))}
      </Container>
    </section>
  );
}
