import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Lier l'application", robots: { index: false } };

const STATE = /^[A-Za-z0-9_-]{16,80}$/;

// L'app SYXTEE Dashboard (Mac / Windows) ouvre cette page dans le navigateur : un clic sur « Autoriser » lie le compte, sans mot de passe dans l'app.
export default async function LiaisonAppPage({ searchParams }: PageProps<"/liaison-app">) {
  const { state, erreur } = await searchParams;
  const s = typeof state === "string" ? state : "";
  if (!STATE.test(s)) {
    return (
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-foreground">Lien invalide</h1>
        <p className="mt-2 text-sm text-muted">Relance la connexion depuis l&apos;application SYXTEE Dashboard.</p>
      </div>
    );
  }
  const user = await requireUser(`/liaison-app?state=${s}`);
  return (
    <form action="/api/app/liaison" method="POST" className="w-full max-w-sm text-center">
      <input type="hidden" name="state" value={s} />
      <p className="font-mono text-xs uppercase tracking-widest text-muted">SYXTEE Dashboard</p>
      <h1 className="mt-3 text-2xl font-semibold text-foreground">Autoriser l&apos;application ?</h1>
      <p className="mt-2 text-sm text-muted">
        L&apos;application accédera à ton compte <span className="text-foreground">{user.email}</span>.
      </p>
      {erreur ? <p role="alert" className="mt-3 text-sm text-accent">Liaison impossible, réessaie.</p> : null}
      <Button type="submit" className="mt-6 w-full">Autoriser</Button>
      <p className="mt-4 text-xs text-muted">Ce n&apos;est pas toi ? Ferme cette page.</p>
    </form>
  );
}
