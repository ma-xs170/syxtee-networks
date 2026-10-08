import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Paramètres : labs", robots: { index: false } };

const LABS = [
  { name: "SYXTEE Cam", text: "Ton téléphone comme caméra du relais." },
  { name: "Scanner réseau", text: "Mesure les connexions autour de toi." },
  { name: "Où capter", text: "Carte de couverture 4G et 5G." },
];

export default async function LabsPage() {
  await requireUser("/dashboard/parametres/labs");
  return (
    <Card title="Fonctions expérimentales">
      <ul className="divide-y divide-line">
        {LABS.map((l) => (
          <li key={l.name} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-semibold">{l.name}</p>
              <p className="mt-0.5 text-sm text-muted">{l.text}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge>Bientôt disponible</Badge>
              <span role="switch" aria-checked="false" aria-disabled="true" aria-label={l.name} className="relative h-6 w-10 rounded-full bg-foreground/10 opacity-60">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-foreground/60" />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
