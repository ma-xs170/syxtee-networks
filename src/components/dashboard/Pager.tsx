import Link from "next/link";

/** Découpe une liste en pages : `pageOf(list, page)` renvoie la tranche, `<Pager>` affiche Précédent / Suivant. */
export const PER_PAGE = 25;

export function pageOf<T>(list: T[], page: number, perPage = PER_PAGE) {
  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  return { rows: list.slice((current - 1) * perPage, current * perPage), page: current, pages, total: list.length };
}

/** Numéro de page lu dans l'adresse (?p=2) ; 1 si absent ou invalide. */
export const pageParam = (p: string | undefined) => Math.max(1, Math.floor(Number(p)) || 1);

export default function Pager({ page, pages, total, href }: { page: number; pages: number; total: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-4 text-sm">
      {page > 1 ? <Link href={href(page - 1)} rel="prev">← Précédent</Link> : <span />}
      <span className="font-mono text-xs text-muted">{total} au total · page {page} sur {pages}</span>
      {page < pages ? <Link href={href(page + 1)} rel="next">Suivant →</Link> : <span />}
    </nav>
  );
}
