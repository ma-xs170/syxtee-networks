import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/dal";
import { getPersonalPlan } from "@/lib/auth/plan";
import { listWorkspaces } from "@/lib/workspace";

export const metadata: Metadata = { title: "Paramètres : usage", robots: { index: false } };

const lim = (n: number) => (Number.isFinite(n) ? String(n) : "Illimité");

function Meter({ label, used, max }: { label: string; used: number | null; max: number }) {
  const pct = used !== null && Number.isFinite(max) && max > 0 ? Math.min(100, (used / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-[14px]">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-[15px] text-foreground">
          {used === null ? "" : `${used} / `}
          {lim(max)}
        </span>
      </div>
      {used !== null && (
        <div role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={Number.isFinite(max) ? max : undefined} aria-label={label} className="mt-3 h-1.5 rounded-full bg-foreground/10">
          <div className="h-full rounded-full bg-foreground/70 transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

/** `embedded` : dans l'onglet Formule du Compte (déjà sous un titre de section), sans cartes. */
export default async function UsagePage({ embedded = false }: { embedded?: boolean } = {}) {
  const [user, plan, workspaces] = await Promise.all([requireUser("/dashboard/parametres/usage"), getPersonalPlan(), listWorkspaces()]);
  const created = workspaces.filter((w) => w.created_by === user.id).length;
  const meters = (
    <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
      <Meter label="Espaces partagés créés" used={created} max={plan.maxWorkspaces} />
      <Meter label="Relais actifs (maximum)" used={null} max={plan.maxRelays} />
      <Meter label="Flux simultanés (maximum)" used={null} max={plan.maxConcurrentStreams} />
      <Meter label="Invités au contrôle à distance (maximum)" used={null} max={plan.maxInvites} />
    </div>
  );
  if (embedded) {
    return (
      <>
        {meters}
        <p className="mt-6 text-[13px] text-muted">Le détail mensuel (heures de relais, bande passante) arrive bientôt. Les statistiques de tes lives sont dans Mon espace.</p>
      </>
    );
  }
  return (
    <>
      <Card title="Limites de ta formule" right={<Badge>{plan.name}</Badge>}>
        {meters}
      </Card>
      <Card title="Heures de relais et bande passante">
        <p className="text-sm text-muted">Le détail mensuel (heures de relais, bande passante, appareils liés) arrive bientôt. En attendant, les statistiques de tes lives sont dans Mon espace.</p>
      </Card>
    </>
  );
}
