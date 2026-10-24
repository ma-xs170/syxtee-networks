import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import { Container } from "@/components/ui";
import { flag, regionList } from "@/lib/regions";
import { site } from "@/lib/site";
import { priceLabel } from "@/lib/videaste";
import { listPublished } from "@/lib/videastes-data";

export const metadata: Metadata = {
  title: "Annuaire des vidéastes",
  description: "Trouve un vidéaste près de chez toi pour filmer ton événement ou ton live : photo, région, tarifs, et contact par SYXTEE.",
  alternates: { canonical: `${site.url}/videastes` },
};

export const revalidate = 60;

export default async function VideastesPage({ searchParams }: { searchParams: Promise<{ pays?: string; q?: string }> }) {
  const { pays, q } = await searchParams;
  const country = pays && /^[A-Za-z]{2}$/.test(pays) ? pays.toUpperCase() : undefined;
  const [cards, all] = await Promise.all([listPublished({ country, q }), listPublished()]);
  const present = new Set(all.map((c) => c.country));
  const countries = regionList().filter((r) => present.has(r.code));
  const input = "h-11 rounded-xl border border-line bg-background px-4 text-sm focus:border-foreground/70 focus:outline-none";

  return (
    <>
      <PageHero kicker="Annuaire" crumb="Vidéastes" title={<>Trouve un <em>vidéaste</em> près de chez toi.</>}>
        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted">Des vidéastes qui connaissent le live IRL. Compare les régions et les tarifs, puis écris-leur par SYXTEE : leur e-mail reste privé.</p>
      </PageHero>
      <Container className="pb-24 pt-12">
        <form action="/videastes" className="mb-10 flex flex-wrap items-center gap-3" role="search">
          <label className="sr-only" htmlFor="v-q">Rechercher</label>
          <input id="v-q" name="q" defaultValue={q ?? ""} placeholder="Nom, ville, spécialité" className={`${input} w-64`} />
          <label className="sr-only" htmlFor="v-pays">Pays</label>
          <select id="v-pays" name="pays" defaultValue={country ?? ""} className={input}>
            <option value="">Tous les pays</option>
            {countries.map((r) => <option key={r.code} value={r.code}>{r.flag} {r.name}</option>)}
          </select>
          <button type="submit" className="h-11 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium">Filtrer</button>
        </form>

        {cards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">
            {all.length === 0 ? "L'annuaire ouvre bientôt : les premiers vidéastes arrivent." : "Aucun vidéaste ne correspond à ta recherche."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <li key={c.id}>
                <Link href={`/videastes/${c.id}`} className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-foreground/[0.04]">
                  <div className="flex items-center gap-4">
                    <span className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-foreground/10">
                      <Image src={c.photo} alt={`Portrait de ${c.name}`} fill sizes="80px" className="object-cover" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold tracking-tight">{c.name}</h2>
                      <p className="mt-1 truncate text-sm text-muted">{flag(c.country)} {c.region}</p>
                    </div>
                  </div>
                  <p className="mt-4 font-mono text-sm tabular-nums">{priceLabel(c)}</p>
                  {c.specialties.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {c.specialties.map((s) => <li key={s} className="rounded-full border border-line px-3 py-1 text-xs text-muted">{s}</li>)}
                    </ul>
                  )}
                  <span className="mt-auto pt-5 text-sm text-muted transition-colors group-hover:text-foreground">Voir la fiche <span aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-12 text-sm text-muted">
          Tu es vidéaste ? <Link href="/inscription?next=%2Fdashboard%2Fvideaste" className="text-foreground underline underline-offset-4">Crée ton compte gratuit</Link> et ajoute ta fiche.
        </p>
      </Container>
    </>
  );
}
