import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";

export const metadata: Metadata = { title: "À propos", description: "SYXTEE NETWORKS : des relais SRTLA et des outils de contrôle pour les streamers IRL, édités depuis la Guadeloupe et hébergés au Québec.", alternates: { canonical: "/a-propos" } };

const facts = [
  { k: "Édité par", v: "LAWCY MUSIC, Petit-Bourg, Guadeloupe" },
  { k: "Serveurs", v: "OVH, Beauharnois (Québec)" },
  { k: "Protocoles", v: "SRTLA, SRT, RTMP" },
  { k: "Contact", v: "contact@syxtee-networks.fr" },
];

export default function APropos() {
  return (
    <>
      <section data-hero data-theme="dark" className="bg-background text-foreground">
        <Container className="pb-12 pt-[calc(5rem+65px)] text-center lg:pb-16 lg:pt-[calc(7rem+65px)]">
          <h1 className="rise h-serif mx-auto max-w-[20ch] text-[clamp(2.75rem,6.5vw,5.5rem)]" style={{ "--i": 0 } as React.CSSProperties}>
            À <em>propos.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">SYXTEE NETWORKS fournit les relais et les outils pour diffuser en direct depuis la rue, avec une connexion mobile qui tient.</p>
        </Container>
      </section>

      <section className="pb-24 sm:pb-32">
        <Container>
          <dl className="mx-auto grid max-w-3xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {facts.map((f) => (
              <div key={f.k} className="bg-background p-6">
                <dt className="font-mono text-xs uppercase tracking-wider text-muted">{f.k}</dt>
                <dd className="mt-2 text-foreground">{f.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-muted">
            Les informations complètes de l&apos;éditeur sont dans les <Link href="/mentions-legales" className="text-foreground underline">mentions légales</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
