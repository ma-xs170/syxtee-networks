import Link from "next/link";
import type { ReactNode } from "react";
import PhoneAndroid from "../illustrations/PhoneAndroid";
import PhoneMoblin from "../illustrations/PhoneMoblin";
import StarlinkMini from "../illustrations/StarlinkMini";
import PopOutImage from "../PopOutImage";
import { PartnerNote } from "../partners/Saily";
import { Container } from "../ui";

const guides: { href: string; kicker: string; title: string; text: string; art: ReactNode; alt: string; partner?: boolean }[] = [
  {
    href: "/moblin",
    kicker: "Application",
    title: "Moblin, l'app qu'on recommande",
    text: "Gratuite sur iPhone, pensée pour l'IRL et compatible SRTLA. Ce qu'elle fait, et comment la brancher sur le relais.",
    art: <PhoneMoblin />,
    alt: "iPhone avec l'app Moblin en live",
  },
  {
    href: "/starlink",
    kicker: "Connexion",
    title: "Starlink en IRL",
    text: "Quand la 4G ne suffit plus : streamer depuis la campagne, la mer ou un festival saturé avec une antenne satellite.",
    art: <StarlinkMini />,
    alt: "Antenne Starlink Mini sur sa béquille",
  },
  {
    href: "/moblin#saily",
    kicker: "Partenaire",
    title: "+ 4G avec Saily",
    text: "Une eSIM Saily sur un 2e téléphone avec Moblink : une 4G de plus dans ton bonding, chez un autre opérateur.",
    art: <PhoneAndroid />,
    alt: "Téléphone Android avec l'app Moblink et une puce eSIM",
    partner: true,
  },
];

export default function Guides() {
  return (
    <section className="border-b border-line pb-24 pt-40 md:pt-48">
      <Container className="grid gap-x-6 gap-y-36 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <div key={g.href}>
            <Link href={g.href} className="group block">
              <PopOutImage alt={g.alt} art={g.art}>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{g.kicker}</p>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">{g.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{g.text}</p>
                <p className="mt-8 text-sm text-muted transition-colors group-hover:text-foreground">
                  Lire le guide <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                </p>
              </PopOutImage>
            </Link>
            {g.partner && <PartnerNote className="mt-3" />}
          </div>
        ))}
      </Container>
    </section>
  );
}
