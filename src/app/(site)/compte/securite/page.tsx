import type { Metadata } from "next";
import { CaretDown } from "@/components/icons";
import type { ReactNode } from "react";
import { EmailForm, PasswordForm } from "@/components/auth/AccountForms";
import Card from "@/components/compte/Card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sécurité", robots: { index: false } };

// Deux lignes repliées : on n'ouvre que ce qu'on veut modifier.
function Row({ title, value, children }: { title: string; value: string; children: ReactNode }) {
  return (
    <details className="group border-b border-line last:border-b-0">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          <span data-sensitive className="block truncate text-xs text-muted">
            {value}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
          Modifier
          <CaretDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="pb-6 pt-2">{children}</div>
    </details>
  );
}

export default async function SecuritePage() {
  const user = await requireUser("/compte/securite");
  return (
    <Card title="Connexion" text="Compte créé avec Google, Twitch ou Discord ? Il n'a pas de mot de passe : utilise « Mot de passe oublié » à la connexion pour en définir un.">
      <div className="border-t border-line">
        <Row title="Adresse email" value={user.email ?? ""}>
          <EmailForm current={user.email ?? ""} />
        </Row>
        <Row title="Mot de passe" value="••••••••••">
          <PasswordForm email={user.email ?? ""} />
        </Row>
      </div>
    </Card>
  );
}
