import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashPage } from "@/components/dashboard/ui";
import NewTicketForm from "@/components/support/NewTicketForm";
import { requireUser } from "@/lib/auth/dal";
import { CATEGORY_FORMS, isCategory } from "@/lib/support-categories";

export const metadata: Metadata = { title: "Nouvelle demande", robots: { index: false } };

// Formulaire propre à une catégorie : champs précis, conseils, puis le message libre.
export default async function CategoryTicketPage({ params }: { params: Promise<{ categorie: string }> }) {
  const { categorie } = await params;
  if (!isCategory(categorie)) notFound();
  await requireUser(`/dashboard/support/nouveau/${categorie}`);
  const cfg = CATEGORY_FORMS[categorie];
  return (
    <DashPage>
      <Link href="/dashboard/support/nouveau" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Choisir un autre sujet
      </Link>
      <h1 className="h-page mb-2 mt-4">{cfg.title}</h1>
      <p className="mb-8 max-w-[60ch] text-sm text-muted">{cfg.intro}</p>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="max-w-3xl">
          <NewTicketForm category={categorie} />
        </div>
        <aside className="h-fit rounded-2xl border border-line bg-surface p-5 text-sm lg:sticky lg:top-6">
          <p className="font-semibold">Pour une réponse rapide</p>
          <ul className="mt-3 space-y-2.5 text-muted">
            {cfg.tips.map((t) => (
              <li key={t} className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>{t}</li>
            ))}
            <li className="flex gap-2.5"><span aria-hidden="true" className="text-foreground">+</span>Une capture d&apos;écran aide toujours.</li>
          </ul>
        </aside>
      </div>
    </DashPage>
  );
}
