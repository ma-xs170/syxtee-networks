"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { MagnifyingGlass } from "@/components/icons";
import { ToolArt } from "@/components/NavTools";
import type { ToolIcon } from "@/lib/site";

// Documentation : barre de recherche centrale (filtre sur le titre, le texte et des mots-clés, sans accent ni casse) et
// guides rangés par thème. Tous les anciens menus du site (Produits, Outils, Ressources) sont ici.

export type Guide = { href: string; title: string; text: string; icon: ToolIcon; keywords?: string; badge?: string };
export type Section = { title: string; guides: Guide[] };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function DocsBrowser({ sections, backdrop, title }: { sections: Section[]; backdrop: ReactNode; title: ReactNode }) {
  const [q, setQ] = useState("");
  const needle = fold(q.trim());
  const shown = useMemo(
    () =>
      sections
        .map((s) => ({ ...s, guides: s.guides.filter((g) => !needle || fold(`${g.title} ${g.text} ${g.keywords ?? ""}`).includes(needle)) }))
        .filter((s) => s.guides.length > 0),
    [sections, needle],
  );

  return (
    <>
      <section data-theme="light" className="relative -mt-[4.75rem] overflow-hidden border-b border-line bg-background pb-20 pt-[9rem] text-foreground sm:pb-24 sm:pt-[10.5rem]">
        {backdrop}
        <div className="relative mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          {title}
          <div className="mt-10">
            <div className="relative mx-auto max-w-2xl">
              <label htmlFor="docs-search" className="sr-only">
                Rechercher dans la documentation
              </label>
              <MagnifyingGlass size={20} aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-foreground/55" />
              <input
                id="docs-search"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher un guide : Moblin, Starlink, DJI, RIST…"
                autoComplete="off"
                className="h-14 w-full rounded-2xl border border-foreground/15 bg-background/80 pl-14 pr-5 text-base text-foreground shadow-[0_18px_40px_-20px_rgba(0,0,0,0.45)] backdrop-blur placeholder:text-foreground/50 focus:border-foreground/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-line py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="space-y-14">
            {shown.length === 0 && (
              <p className="text-center text-sm text-muted">Aucun guide ne correspond à « {q} ». Essaie un autre mot, ou ouvre une demande depuis ton support.</p>
            )}
            {shown.map((s) => (
              <section key={s.title} aria-labelledby={`d-${s.title}`}>
                <h2 id={`d-${s.title}`} className="mb-5 text-xl font-semibold tracking-tight">
                  {s.title}
                </h2>
                <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {s.guides.map((g) => (
                    <li key={g.href}>
                      <Link
                        href={g.href}
                        className="group flex h-full items-center gap-5 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2 sm:p-6"
                      >
                        <span className="h-16 w-16 shrink-0 transition-transform duration-300 ease-out group-hover:scale-[1.06] sm:h-20 sm:w-20">
                          <ToolArt icon={g.icon} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2 text-lg font-medium">
                            {g.title}
                            {g.badge && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-on-accent">{g.badge}</span>}
                            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                              →
                            </span>
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-muted">{g.text}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
