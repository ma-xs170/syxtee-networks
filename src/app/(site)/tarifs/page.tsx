import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "@/components/icons";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules, à partir de 4,99 € par mois. Compare les fonctions de chaque formule.",
  alternates: { canonical: "/tarifs" },
};

// Les limites reprennent plans.ts (Basique, Premium, Extra) : ne rien annoncer ici qui ne soit pas appliqué par le serveur.
type Tier = { id: string; name: string; price: string; pitch: string; highlight?: boolean; includes?: string; items: string[] };
const tiers: Tier[] = [
  {
    id: "basique",
    name: "Basique",
    price: "4,99",
    pitch: "Pour démarrer : un flux fiable et le contrôle à distance.",
    items: ["1 flux (SRTLA, RTMP ou RIST)", "1 direct à la fois", "Contrôle à distance d'OBS", "Santé du flux en temps réel", "Écran de secours en cas de coupure", "Clés de diffusion"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "9,99",
    pitch: "Pour streamer régulièrement, avec tout l'espace client.",
    highlight: true,
    includes: "Tout Basique, plus :",
    items: ["10 flux, 5 par protocole", "3 directs en même temps", "Statistiques détaillées", "Historique des directs", "Sauvegardes de scènes", "Multichat"],
  },
  {
    id: "extra",
    name: "Extra",
    price: "19,99",
    pitch: "Pour les équipes et les créateurs qui diffusent beaucoup.",
    includes: "Tout Premium, plus :",
    items: ["Flux illimités", "10 directs en même temps", "Accès anticipé aux nouveautés"],
  },
];

type Row = { label: string; v: [string | boolean, string | boolean, string | boolean] };
const compare: { group: string; rows: Row[] }[] = [
  {
    group: "Flux",
    rows: [
      { label: "Flux actifs", v: ["1", "10", "Illimités"] },
      { label: "Directs en même temps", v: ["1", "3", "10"] },
      { label: "Protocoles SRTLA, RTMP et RIST", v: [true, true, true] },
      { label: "Clés de diffusion", v: [true, true, true] },
    ],
  },
  {
    group: "Contrôle à distance",
    rows: [
      { label: "Piloter OBS depuis un navigateur", v: [true, true, true] },
      { label: "Écran de secours automatique", v: [true, true, true] },
      { label: "Sauvegardes de scènes", v: [false, true, true] },
    ],
  },
  {
    group: "Suivi",
    rows: [
      { label: "Santé du flux en temps réel", v: [true, true, true] },
      { label: "Statistiques détaillées", v: [false, true, true] },
      { label: "Historique des directs", v: [false, true, true] },
      { label: "Multichat", v: [false, true, true] },
    ],
  },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check size={18} weight="bold" className="mx-auto text-foreground" aria-label="Inclus" />;
  if (v === false) return <span className="text-muted" aria-label="Non inclus">·</span>;
  return <span className="font-medium">{v}</span>;
}

export default function TarifsPage() {
  return (
    <>
      <section className="border-b border-line py-20 text-center sm:py-24">
        <Container>
          <h1 className="h-hero mx-auto max-w-3xl">Des tarifs simples.</h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Trois formules, à partir de <strong>4,99 € par mois</strong>. Sans engagement : tu changes ou tu arrêtes quand tu veux.
          </p>
          <p className="mx-auto mt-2 text-sm text-muted">TVA non applicable, article 293 B du CGI.</p>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {tiers.map((t) => (
              <article key={t.id} className={`flex flex-col rounded-2xl border p-7 ${t.highlight ? "border-foreground/40 bg-surface" : "border-line"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{t.name}</h2>
                  {t.highlight && <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-xs text-muted">Le plus choisi</span>}
                </div>
                <p className="mt-3 min-h-[3rem] text-sm leading-relaxed text-muted">{t.pitch}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-semibold tracking-tight">{t.price} €</span>
                  <span className="text-sm text-muted">/ mois</span>
                </p>
                <Link href="/acces" className={`btn mt-6 w-full ${t.highlight ? "btn-primary" : "btn-secondary"}`}>
                  Demander l&apos;accès
                </Link>
                <div className="mt-7 border-t border-line pt-6">
                  {t.includes && <p className="mb-4 text-sm font-medium">{t.includes}</p>}
                  <ul className="space-y-3">
                    {t.items.map((i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-foreground" aria-hidden="true" />
                        {i}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-16 sm:py-20">
        <Container className="max-w-4xl">
          <h2 className="h-section">Comparer les formules</h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="py-4 pr-4 font-normal text-muted"><span className="sr-only">Fonction</span></th>
                  {tiers.map((t) => (
                    <th key={t.id} scope="col" className="w-28 py-4 text-center font-semibold">{t.name}</th>
                  ))}
                </tr>
              </thead>
              {compare.map((g) => (
                <tbody key={g.group}>
                  <tr>
                    <th colSpan={4} scope="colgroup" className="pb-2 pt-8 text-xs font-medium uppercase tracking-[0.12em] text-muted">{g.group}</th>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.label} className="border-b border-line">
                      <th scope="row" className="py-3.5 pr-4 font-normal">{r.label}</th>
                      {r.v.map((v, i) => (
                        <td key={i} className="py-3.5 text-center"><Cell v={v} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
          <p className="mt-8 text-sm text-muted">
            L&apos;ouverture au public arrive bientôt : en attendant, l&apos;accès se fait sur demande. <Link href="/acces" className="text-foreground underline underline-offset-4">Demander l&apos;accès</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
