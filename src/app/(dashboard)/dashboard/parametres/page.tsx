import type { Metadata } from "next";
import { signOut } from "@/app/(auth)/actions";
import { DeleteAccountForm } from "@/components/auth/AccountForms";
import StreamModeToggle from "@/components/dashboard/StreamModeToggle";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Paramètres", robots: { index: false } };

export default async function ParametresPage() {
  const user = await requireUser("/dashboard/parametres");
  return (
    <DashPage>
      <DashHeader lead="Tes" hl="paramètres" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileLabel>Mode stream</TileLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted">Floute clés, URLs et e-mail pour montrer ton dashboard en live. Le réglage reste actif sur ce navigateur.</p>
          <div className="mt-5">
            <StreamModeToggle withLabel />
          </div>
        </Tile>
        <Tile>
          <TileLabel>Session</TileLabel>
          <p className="mt-4 text-sm text-muted">
            Connecté avec <span data-sensitive className="text-foreground">{user.email}</span>
          </p>
          <form action={signOut} className="mt-5">
            <button type="submit" className="h-11 rounded-full border border-line px-5 text-sm font-medium transition-colors hover:bg-white/5">
              Déconnexion
            </button>
          </form>
        </Tile>
        <Tile className="lg:col-span-2">
          <TileLabel>Supprimer mon compte</TileLabel>
          <div className="mt-4 max-w-xl">
            <DeleteAccountForm />
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
