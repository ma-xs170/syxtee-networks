import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "@/components/icons";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules, à partir de 4,99 € par mois : serveurs SRTLA et RTMP, contrôle à distance d'OBS, multistream, équipes et régies. Sans engagement.",
  alternates: { canonical: "/tarifs" },
};

// Les limites reprennent plans.ts : ne rien annoncer ici qui ne soit pas appliqué par le serveur.
// Pas de paiement sur le site pour l'instant : le bouton de chaque formule est « Demander l'accès ».
type Tier = { id: string; name: string; price: string; pitch: string; highlight?: boolean; includes?: string; items: string[] };
const tiers: Tier[] = [
  {
    id: "essentiel",
    name: "Essentiel",
    price: "4,99",
    pitch: "Le point de départ d'un direct maîtrisé, de n'importe où.",
    items: ["1 serveur dédié, en SRTLA ou RTMP", "1 direct à la fois", "Contrôle à distance d'OBS", "Santé du flux en temps réel", "Écran de secours automatique", "Garde audio du micro", "Clés de diffusion privées"],
  },
  {
    id: "signature",
    name: "Signature",
    price: "9,99",
    pitch: "Pour les créateurs qui diffusent régulièrement et veulent tout.",
    highlight: true,
    includes: "Tout Essentiel, plus :",
    items: ["10 serveurs, 5 par protocole", "3 directs en même temps", "3 invités pour piloter ton OBS", "1 espace partagé pour ton équipe", "Statistiques détaillées et historique des directs", "Sauvegardes de scènes et Multichat", "Autogérance du drone et des prises", "Régie IA jusqu'à 3 caméras"],
  },
  {
    id: "prestige",
    name: "Prestige",
    price: "19,99",
    pitch: "Pour les régies et les équipes qui exigent le meilleur.",
    includes: "Tout Signature, plus :",
    items: ["Serveurs illimités", "10 directs en même temps", "5 espaces partagés pour tes régies", "5 invités pour piloter ton OBS", "Régie IA jusqu'à 6 caméras", "Accès anticipé aux nouveautés"],
  },
];

type Row = { label: string; v: [string | boolean, string | boolean, string | boolean] };
const compare: { group: string; rows: Row[] }[] = [
  {
    group: "Serveurs",
    rows: [
      { label: "Serveurs actifs", v: ["1", "10", "Illimités"] },
      { label: "Directs en même temps", v: ["1", "3", "10"] },
      { label: "Protocoles SRTLA et RTMP", v: [true, true, true] },
      { label: "Clés de diffusion privées", v: [true, true, true] },
    ],
  },
  {
    group: "Contrôle à distance",
    rows: [
      { label: "Piloter OBS depuis un navigateur ou un téléphone", v: [true, true, true] },
      { label: "Écran de secours automatique", v: [true, true, true] },
      { label: "Invités OBS (avec compte)", v: ["Aucun", "3", "5"] },
      { label: "Sauvegardes de scènes", v: [false, true, true] },
    ],
  },
  {
    group: "Régie automatique",
    rows: [
      { label: "Écran de secours si la connexion coupe", v: [true, true, true] },
      { label: "Garde audio du micro", v: [true, true, true] },
      { label: "Autogérance du drone et des autres prises", v: [false, true, true] },
      { label: "Régie IA multi-caméras (Mistral ou Claude, avec ta clé)", v: [false, "3 caméras", "6 caméras"] },
    ],
  },
  {
    group: "Équipes et régies",
    rows: [
      { label: "Espaces partagés", v: ["Aucun", "1", "5"] },
      { label: "Membres avec rôles (propriétaire, administrateur, membre)", v: [false, true, true] },
    ],
  },
  {
    group: "Suivi",
    rows: [
      { label: "Santé du flux en temps réel", v: [true, true, true] },
      { label: "Statistiques détaillées", v: [false, true, true] },
      { label: "Historique des directs", v: [false, true, true] },
      { label: "Multichat", v: [false, true, true] },
      { label: "Accès anticipé aux nouveautés", v: [false, false, true] },
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
          <h1 className="h-serif mx-auto max-w-3xl text-[clamp(2.75rem,7vw,4.75rem)]">Des tarifs <em>simples.</em></h1>
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
                  <span className="whitespace-nowrap text-4xl font-semibold tracking-tight">{t.price} €</span>
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
          <div className="bento-cell flex flex-col items-start justify-between gap-6 p-7 sm:flex-row sm:items-center sm:p-9">
            <div>
              <h2 className="h-section">Une régie, une <em>équipe ?</em></h2>
              <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-muted">Les espaces partagés réunissent plusieurs OBS et plusieurs personnes, chacune avec son compte et son rôle.</p>
            </div>
            <Link href="/espaces-partages" className="btn btn-primary shrink-0">Découvrir les espaces partagés</Link>
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-16 sm:py-20">
        <Container className="max-w-4xl">
          <details className="group">
          <summary className="cursor-pointer list-none text-center text-base text-foreground underline underline-offset-[6px] decoration-foreground/40 transition-colors hover:decoration-foreground [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Comparer les formules en détail</span>
            <span className="hidden group-open:inline">Masquer la comparaison</span>
          </summary>
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
          </details>
          <p className="mt-8 text-center text-sm text-muted">
            L&apos;ouverture au public arrive bientôt : en attendant, l&apos;accès se fait sur demande. <Link href="/acces" className="text-foreground underline underline-offset-4">Demander l&apos;accès</Link>.
          </p>
        </Container>
      </section>
    </>
  );
}
