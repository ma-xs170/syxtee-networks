import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { flag } from "@/lib/regions";
import { site } from "@/lib/site";
import { priceLabel } from "@/lib/videaste";
import { getPublished } from "@/lib/videastes-data";
import ContactForm from "./ContactForm";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const c = await getPublished((await params).id);
  if (!c) return { title: "Vidéaste introuvable", robots: { index: false } };
  return {
    title: `${c.name}, vidéaste à ${c.region}`,
    description: `${c.name}, vidéaste à ${c.region} : ${priceLabel(c)}. Contact par SYXTEE NETWORKS.`,
    alternates: { canonical: `${site.url}/videastes/${c.id}` },
  };
}

export default async function VideastePage({ params }: { params: Promise<{ id: string }> }) {
  const c = await getPublished((await params).id);
  if (!c) notFound();
  return (
    <main className="pb-24 pt-12 sm:pt-16">
      <Container>
        <Link href="/videastes" className="text-sm text-muted transition-colors hover:text-foreground"><span aria-hidden="true">←</span> Tous les vidéastes</Link>
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <article>
            <div className="flex flex-wrap items-center gap-6">
              <span className="relative size-32 shrink-0 overflow-hidden rounded-3xl bg-foreground/10">
                <Image src={c.photo} alt={`Portrait de ${c.name}`} fill sizes="128px" className="object-cover" priority />
              </span>
              <div className="min-w-0">
                <h1 className="break-words text-4xl font-semibold tracking-tight">{c.name}</h1>
                <p className="mt-2 text-lg text-muted">{flag(c.country)} {c.region}</p>
                <p className="mt-3 font-mono text-base tabular-nums">{priceLabel(c)}</p>
              </div>
            </div>
            {c.bio && <p className="mt-8 max-w-[62ch] whitespace-pre-line text-base leading-relaxed">{c.bio}</p>}
            {c.specialties.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {c.specialties.map((s) => <li key={s} className="rounded-full border border-line px-3 py-1 text-sm text-muted">{s}</li>)}
              </ul>
            )}
          </article>
          <aside className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold tracking-tight">Écrire à {c.name}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">Ton message passe par SYXTEE. Son e-mail reste privé, il te répond sur le tien.</p>
            <div className="mt-5"><ContactForm cardId={c.id} /></div>
          </aside>
        </div>
      </Container>
    </main>
  );
}
