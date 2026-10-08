import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { docBySlug, docGroups, docs, type DocBlock } from "@/lib/docs";

export const dynamicParams = false;
export const generateStaticParams = () => docs.map((d) => ({ slug: d.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = docBySlug((await params).slug);
  return d ? { title: `${d.title} · Documentation`, description: d.summary, alternates: { canonical: `/docs/${d.slug}` } } : {};
}

function Block({ b }: { b: DocBlock }) {
  switch (b.type) {
    case "h":
      return <h2 className="mt-10 text-xl font-semibold tracking-tight">{b.text}</h2>;
    case "p":
      return <p className="mt-4 text-base leading-relaxed text-muted">{b.text}</p>;
    case "steps":
      return (
        <ol className="mt-4 space-y-3">
          {b.items.map((x, i) => (
            <li key={x} className="flex gap-3 text-base leading-relaxed text-muted">
              <span className="mt-0.5 font-mono text-sm tabular-nums text-foreground">{i + 1}.</span>
              <span>{x}</span>
            </li>
          ))}
        </ol>
      );
    case "list":
      return (
        <ul className="mt-4 space-y-2.5">
          {b.items.map((x) => (
            <li key={x} className="flex gap-2.5 text-base leading-relaxed text-muted">
              <span aria-hidden="true" className="text-foreground">+</span>
              <span>{x}</span>
            </li>
          ))}
        </ul>
      );
    case "note":
      return <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-muted">{b.text}</p>;
    case "img":
      return (
        <figure className="mt-8">
          <Image src={b.src} alt={b.alt} width={b.w} height={b.h} sizes="(min-width: 1024px) 640px, 100vw" className={`h-auto rounded-2xl border border-line ${b.h > b.w ? "max-w-[260px]" : "w-full"}`} />
        </figure>
      );
  }
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = docBySlug((await params).slug);
  if (!doc) notFound();
  const i = docs.indexOf(doc);
  const next = docs[i + 1];
  return (
    <section className="border-b border-line py-12 sm:py-16">
      <Container className="grid gap-12 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Documentation" className="lg:sticky lg:top-24 lg:self-start">
          <Link href="/docs" className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-foreground">← Documentation</Link>
          <div className="mt-5 hidden space-y-6 lg:block">
            {docGroups.map((g) => (
              <div key={g}>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{g}</p>
                <ul className="mt-2 space-y-1">
                  {docs.filter((d) => d.group === g).map((d) => (
                    <li key={d.slug}>
                      <Link href={`/docs/${d.slug}`} aria-current={d.slug === doc.slug ? "page" : undefined} className={`block rounded-lg px-2 py-1.5 text-sm hover:text-foreground ${d.slug === doc.slug ? "bg-foreground/10 font-medium text-foreground" : "text-muted"}`}>{d.title}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
        <article className="max-w-2xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{doc.group}</p>
          <h1 className="h-serif mt-3 text-[clamp(2.25rem,5vw,3.5rem)]">{doc.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{doc.summary}</p>
          {doc.blocks.map((b, k) => <Block key={k} b={b} />)}
          {next && (
            <Link href={`/docs/${next.slug}`} className="mt-14 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2">
              <span><span className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Suivant</span><span className="mt-1 block text-lg font-medium">{next.title}</span></span>
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </article>
      </Container>
    </section>
  );
}
