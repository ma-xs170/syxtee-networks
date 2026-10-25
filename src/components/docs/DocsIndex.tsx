"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@/components/icons";
import { docGroups, docs } from "@/lib/docs";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Index de la documentation : recherche (titre, résumé, mots-clés) et guides par thème. Texte seul, pas d'illustration.
export default function DocsIndex() {
  const [q, setQ] = useState("");
  const needle = fold(q.trim());
  const shown = useMemo(
    () =>
      docGroups
        .map((g) => ({ g, items: docs.filter((d) => d.group === g && (!needle || fold(`${d.title} ${d.summary} ${d.keywords ?? ""}`).includes(needle))) }))
        .filter((s) => s.items.length > 0),
    [needle],
  );
  return (
    <>
      <div className="relative mx-auto mt-10 max-w-2xl">
        <label htmlFor="docs-search" className="sr-only">Rechercher dans la documentation</label>
        <MagnifyingGlass size={20} aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="docs-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher : relais, plugin OBS, invités…"
          autoComplete="off"
          className="h-14 w-full rounded-2xl border border-line-strong bg-surface pl-14 pr-5 text-base text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
        />
      </div>
      <div className="mt-20 space-y-16 text-left">
        {shown.length === 0 && <p className="text-center text-sm text-muted">Aucun guide ne correspond à « {q} ». Ouvre une demande depuis le support.</p>}
        {shown.map(({ g, items }) => (
          <section key={g} aria-labelledby={`d-${g}`}>
            <h2 id={`d-${g}`} className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">{g}</h2>
            <ul className="mt-5 grid gap-x-12 md:grid-cols-2">
              {items.map((d) => (
                <li key={d.slug} className="border-t border-line">
                  <Link href={`/docs/${d.slug}`} className="group block py-5">
                    <span className="block text-lg font-semibold tracking-tight transition-opacity group-hover:opacity-70">{d.title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">{d.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
