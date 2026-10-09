import type { Metadata } from "next";
import Link from "next/link";
import { DashPage } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { SUPPORT_CATEGORIES } from "@/lib/support-categories";

export const metadata: Metadata = { title: "Nouvelle demande", robots: { index: false } };

// Étape 1 : choisir la catégorie. Chaque catégorie a son propre formulaire (/nouveau/<catégorie>) avec des champs adaptés.
export default async function NewTicketPage() {
  await requireUser("/dashboard/support/nouveau");
  return (
    <DashPage>
      <Link href="/dashboard/support" className="text-sm text-muted transition-colors hover:text-foreground">
        ← Assistance
      </Link>
      <h1 className="h-page mb-2 mt-4">Nouvelle <em>demande</em></h1>
      <p className="mb-8 max-w-[60ch] text-sm text-muted">Choisis le sujet : le formulaire s&apos;adapte pour qu&apos;on te réponde vite, généralement sous 24 h.</p>
      <div className="grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SUPPORT_CATEGORIES.map((c) => (
          <Link key={c.id} href={`/dashboard/support/nouveau/${c.id}`} className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-2">
            <span className="flex items-center justify-between gap-3 text-sm font-medium">
              {c.label}
              <span aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-0.5">→</span>
            </span>
            <span className="mt-1.5 text-xs leading-relaxed text-muted">{c.hint}</span>
          </Link>
        ))}
      </div>
    </DashPage>
  );
}
