import type { Metadata } from "next";
import { connection } from "next/server";
import { samples } from "@/emails/templates";
import { requireAdmin } from "@/lib/admin";
import { renderEmail } from "@/lib/email/send";
import SendTest from "./SendTest";

export const metadata: Metadata = { title: "Emails", robots: { index: false } };

// Aperçu de tous les emails SYXTEE (HTML + sujet), avec envoi de test. Admin seulement (404 sinon), ou en local.
export default async function DevEmailsPage() {
  await connection();
  if (process.env.NODE_ENV !== "development") await requireAdmin();
  const list = await Promise.all(samples().map(async (s) => ({ ...s, ...(await renderEmail(s.email)) })));

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Emails</h1>
          <p className="mt-2 text-sm text-muted">{list.length} modèles. Les tests partent vers ton adresse.</p>
        </div>
        <SendTest emailKey="all" label="M'envoyer tous les tests" />
      </div>
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {list.map((e) => (
          <section key={e.key} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-medium">{e.label}</h2>
                <p className="font-mono text-xs text-muted">{e.subject}</p>
              </div>
              <SendTest emailKey={e.key} />
            </div>
            <iframe title={e.label} srcDoc={e.html} sandbox="" className="h-[640px] w-full rounded-xl border border-line bg-background" />
          </section>
        ))}
      </div>
    </main>
  );
}
