import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Receipt } from "@/components/icons";
import { requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";
import ManageButton from "./ManageButton";

export const metadata: Metadata = { title: "Paramètres : facturation", robots: { index: false } };

export default async function FacturationPage() {
  const [, plan] = await Promise.all([requireUser("/dashboard/parametres/facturation"), getPlan()]);
  return (
    <>
      <Card title="Formule actuelle" right={<Badge tone="ok">{plan.name}</Badge>}>
        <p className="text-sm text-muted">Les prix seront affichés ici. Bientôt disponible. Le tableau de bord de l'Encodeur est inclus dans la formule Payant (illimité pour les partenaires).</p>
        <div className="mt-5">
          <ManageButton />
        </div>
      </Card>
      <Card title="Factures">
        <EmptyState icon={<Receipt weight="light" />} title="Aucune facture pour l'instant" text="Tes factures apparaîtront ici dès ton premier paiement." />
      </Card>
    </>
  );
}
