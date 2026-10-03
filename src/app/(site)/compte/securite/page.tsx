import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { EmailForm, PasswordForm } from "@/components/auth/AccountForms";
import Card from "@/components/compte/Card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Sécurité", robots: { index: false } };

export default async function SecuritePage() {
  const user = await requireUser("/compte/securite");
  return (
    <>
      <Card title="Adresse email" text="Un lien de confirmation part vers l'ancienne et la nouvelle adresse.">
        <EmailForm current={user.email ?? ""} />
      </Card>
      <Card title="Mot de passe" text="Compte créé avec Google, Twitch ou Discord, sans mot de passe ? Utilise « Mot de passe oublié » à la connexion pour en définir un.">
        <PasswordForm email={user.email ?? ""} />
      </Card>
      <Card title="Session" text="Tu es connecté sur cet appareil.">
        <form action={signOut}>
          <button type="submit" className="h-11 rounded-xl border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
            Se déconnecter
          </button>
        </form>
      </Card>
    </>
  );
}
