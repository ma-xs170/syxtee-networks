import type { Metadata } from "next";
import Link from "next/link";
import Glow from "@/components/landing/Glow";
import { Check, X } from "@/components/icons";
import { Container } from "@/components/ui";
import GridBackground from "@/components/ui/GridBackground";

export const metadata: Metadata = {
  title: "Tarifs",
  description: "Trois formules, à partir de 4,99 € par mois : serveur SRTLA et RTMP, contrôle à distance d'OBS dès Signature, multistream, équipes et régies. Sans engagement.",
  alternates: { canonical: "/tarifs" },
};

// Pas de paiement sur le site pour l'instant : le bouton de chaque formule est « Demander l'accès ».
// Les trois tableaux ci-dessous donnent une valeur par formule, dans l'ordre : Essentiel, Signature, Prestige.
type Three<T> = [T, T, T];

const tiers = [
  { id: "essentiel", name: "Essentiel", price: "4,99", pitch: "Le point de départ d'un direct maîtrisé, de n'importe où.", highlight: false },
  { id: "signature", name: "Signature", price: "9,99", pitch: "Pour les créateurs qui diffusent régulièrement et veulent tout.", highlight: true },
  { id: "prestige", name: "Prestige", price: "19,99", pitch: "Pour les régies et les équipes qui exigent le meilleur.", highlight: false },
];

// Chiffres clés.
const limits: { label: string; note?: string; v: Three<string> }[] = [
  { label: "Serveurs (SRTLA - RTMP)", note: "Secours automatique, garde audio et santé du flux intégrés", v: ["1", "10", "∞"] },
  { label: "Directs en même temps", v: ["1", "3", "10"] },
  { label: "Espaces partagés", v: ["0", "1", "5"] },
  { label: "Invités au contrôle à distance", v: ["0", "3", "5"] },
  { label: "Caméras pour la régie IA", v: ["0", "3", "6"] },
];

// Fonctions : ✓ inclus, ✕ non inclus.
const features: { label: string; note?: string; v: Three<boolean> }[] = [
  { label: "Contrôle à distance", note: "Scènes, audio, direct et multistream", v: [false, true, true] },
  { label: "Régie automatique", note: "Drone et prises autogérés", v: [false, true, true] },
  { label: "Statistiques", note: "Détail et historique des directs", v: [false, true, true] },
  { label: "Accès anticipé", note: "Les nouveautés avant tout le monde", v: [false, false, true] },
];

export default function TarifsPage() {
  return (
    <>
      <Glow />
      <section className="relative -mt-[4.0625rem] overflow-hidden border-b border-line pb-16 pt-[9rem] text-center sm:pb-24 sm:pt-[10.5rem]">
        <GridBackground />
        <Container className="relative">
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
            {tiers.map((t, k) => (
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

                <ul className="mt-7 divide-y divide-foreground/10 border-y border-foreground/10">
                  {limits.map((l) => {
                    const v = l.v[k];
                    return (
                      <li key={l.label} className="grid grid-cols-[3.5rem_1fr] items-center">
                        <span className="border-r border-foreground/15 py-3 pr-3 text-right font-mono text-lg font-semibold leading-none">
                          {v === "0" ? <X size={16} weight="bold" className="ml-auto text-muted" aria-label="Aucun" /> : v}
                        </span>
                        <span className={`py-3 pl-4 text-sm ${v === "0" ? "text-muted" : ""}`}>
                          {l.label}
                          {l.note && <span className="mt-0.5 block text-xs text-muted">{l.note}</span>}
                        </span>
                      </li>
                    );
                  })}
                  {features.map((f) => {
                    const on = f.v[k];
                    return (
                      <li key={f.label} className="grid grid-cols-[3.5rem_1fr] items-center">
                        <span className="border-r border-foreground/15 py-3 pr-3">
                          {on ? <Check size={18} weight="bold" className="ml-auto text-ok" aria-label="Inclus" /> : <X size={16} weight="bold" className="ml-auto text-muted" aria-label="Non inclus" />}
                        </span>
                        <span className={`py-3 pl-4 text-sm ${on ? "" : "text-muted"}`}>
                          <span className="block">{f.label}</span>
                          <span className="mt-0.5 block text-xs text-muted">{f.note}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
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
    </>
  );
}
