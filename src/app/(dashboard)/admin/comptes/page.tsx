import type { Metadata } from "next";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { normalizeSupportId } from "@/lib/support-id";

export const metadata: Metadata = { title: "Admin · Comptes", robots: { index: false } };

// Admin : retrouver un compte depuis l'ID support donné dans un ticket Discord (SYX-XXXX-XXXX).
// Réservée à ADMIN_EMAILS (404 sinon). Lecture avec la clé secrète, côté serveur uniquement.

const field = "h-11 w-full rounded-full border border-line bg-black px-4 font-mono text-sm uppercase text-foreground placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

const PLAN: Record<string, string> = { free: "Gratuit", beta: "Bêta", paid: "Payant", partner: "Partenaire", admin: "Admin" };

const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Guadeloupe" }) : "jamais";

type Found = {
  id: string;
  support_id: string;
  first_name: string | null;
  last_name: string | null;
  plan: string;
  suspended_at: string | null;
  created_at: string;
  email: string | null;
  last_sign_in_at: string | null;
  relays: number;
};

async function findAccount(supportId: string): Promise<Found | null> {
  const db = createAdminClient();
  const { data: p } = await db
    .from("profiles")
    .select("id, support_id, first_name, last_name, plan, suspended_at, created_at")
    .eq("support_id", supportId)
    .maybeSingle();
  if (!p) return null;
  const [{ data: u }, { count }] = await Promise.all([
    db.auth.admin.getUserById(p.id),
    db.from("relays").select("id", { count: "exact", head: true }).eq("user_id", p.id).eq("archived", false),
  ]);
  return { ...p, email: u.user?.email ?? null, last_sign_in_at: u.user?.last_sign_in_at ?? null, relays: count ?? 0 };
}

export default async function AdminComptesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const raw = typeof q === "string" ? q.trim() : "";
  const supportId = raw ? normalizeSupportId(raw) : null;
  const account = supportId && hasAdmin ? await findAccount(supportId) : null;

  const rows: [string, string][] = account
    ? [
        ["ID support", account.support_id],
        ["Email", account.email ?? "?"],
        ["Prénom", account.first_name ?? "?"],
        ["Nom", account.last_name ?? "?"],
        ["Formule", PLAN[account.plan] ?? account.plan],
        ["Statut", account.suspended_at ? `Suspendu le ${day(account.suspended_at)}` : "Actif"],
        ["Relais actifs", String(account.relays)],
        ["Inscrit le", day(account.created_at)],
        ["Dernière connexion", day(account.last_sign_in_at)],
        ["ID interne", account.id],
      ]
    : [];

  return (
    <DashPage>
      <DashHeader lead="Admin" hl="Comptes" sub="Retrouve un compte avec l'ID support qu'il a collé dans son ticket Discord.">
        <ArrowLink href="/admin/securite">Sécurité</ArrowLink>
      </DashHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Tile>
          <TileLabel>Recherche</TileLabel>
          <form method="get" className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <label htmlFor="q" className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
                ID support
              </label>
              <input id="q" name="q" required defaultValue={raw} placeholder="SYX-7K3F-92QD" autoComplete="off" spellCheck={false} className={field} />
            </div>
            <button type="submit" className="h-11 whitespace-nowrap rounded-full bg-white px-5 text-sm font-medium text-black transition-colors hover:bg-neutral-200 active:scale-[0.98]">
              Rechercher
            </button>
          </form>
          {!hasAdmin && <p className="mt-4 text-sm text-muted">Clé secrète Supabase absente : recherche impossible.</p>}
        </Tile>
        <Tile>
          <TileLabel>Résultat</TileLabel>
          {!raw ? (
            <p className="mt-4 text-sm text-muted">Tape un ID au format SYX-XXXX-XXXX.</p>
          ) : !supportId ? (
            <p className="mt-4 text-sm text-muted">« {raw} » n&apos;est pas un ID support valide (8 signes, sans 0, O, 1 ni I).</p>
          ) : !account ? (
            <p className="mt-4 text-sm text-muted">Aucun compte avec l&apos;ID {supportId}.</p>
          ) : (
            <dl className="mt-4 divide-y divide-line text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-2.5">
                  <dt className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{k}</dt>
                  <dd className="min-w-0 break-all font-mono text-xs">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Tile>
      </div>
    </DashPage>
  );
}
