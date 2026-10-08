import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Paramètres : documents", robots: { index: false } };

const DOCS = [
  { label: "Documentation", text: "Démarrer, relais, contrôle à distance.", href: "/docs" },
  { label: "Fonctionnement", text: "Comment le bonding réunit tes connexions.", href: "/fonctionnement" },
  { label: "OBS CLOUD", text: "Relier ton ordinateur et piloter ton OBS.", href: "/controle-a-distance" },
  { label: "Relais SRTLA", text: "Envoyer plusieurs connexions vers un seul relais.", href: "/relais" },
  { label: "FAQ", text: "Les questions fréquentes.", href: "/faq" },
];

export default async function DocumentsPage() {
  await requireUser("/dashboard/parametres/documents");
  return (
    <Card title="Documents">
      <ul className="divide-y divide-line">
        {DOCS.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="flex items-center justify-between gap-4 py-4 transition-colors hover:text-foreground">
              <span>
                <span className="block text-sm font-semibold">{d.label}</span>
                <span className="mt-0.5 block text-sm text-muted">{d.text}</span>
              </span>
              <span aria-hidden="true" className="text-muted">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
