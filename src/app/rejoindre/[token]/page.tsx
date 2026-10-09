import { createHash } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import JoinButton from "@/components/dashboard/JoinButton";
import { getUser } from "@/lib/auth/dal";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";

// Invitation reçue par email pour rejoindre un espace partagé. Il faut un compte avec l'adresse invitée.
export const metadata: Metadata = { title: "Rejoindre un espace", robots: { index: false, follow: false }, referrer: "no-referrer" };

const isOpen = (r: { accepted_at: string | null; revoked_at: string | null; expires_at: string } | null) => !!r && !r.accepted_at && !r.revoked_at && Date.parse(r.expires_at) > Date.now();

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^swi_[0-9a-f]{48}$/.test(token)) notFound();
  const user = await getUser();
  const db = hasAdmin ? createAdminClient() : null;
  const { data: inv } = db
    ? await db.from("workspace_invites").select("email, role, expires_at, accepted_at, revoked_at, workspaces(name)").eq("token_hash", createHash("sha256").update(token).digest("hex")).maybeSingle()
    : { data: null };
  const row = inv as unknown as { email: string; role: string; expires_at: string; accepted_at: string | null; revoked_at: string | null; workspaces: { name: string } | { name: string }[] | null } | null;
  const name = Array.isArray(row?.workspaces) ? row?.workspaces[0]?.name : row?.workspaces?.name;
  const valid = isOpen(row);
  const mine = !!row && !!user?.email && user.email.toLowerCase() === row.email.toLowerCase();

  return (
    <main className="mx-auto grid min-h-dvh max-w-md place-items-center px-4 py-16">
      <div className="w-full tile p-7 text-center">
        {!valid ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Invitation introuvable</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">Cette invitation n&apos;est plus valable : elle a expiré, elle a été retirée ou elle a déjà servi. Demande-en une nouvelle.</p>
            <Link href="/dashboard" className="btn btn-secondary mt-6">Aller à mon espace</Link>
          </>
        ) : !user ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Un compte est nécessaire</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Tu es invité à rejoindre <strong>{name}</strong>. Crée un compte ou connecte-toi avec <strong data-sensitive>{row!.email}</strong> : l&apos;invitation est liée à cette adresse.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href={`/inscription?email=${encodeURIComponent(row!.email)}&next=${encodeURIComponent(`/rejoindre/${token}`)}`} className="btn btn-secondary">Créer mon compte</Link>
              <Link href={`/connexion?email=${encodeURIComponent(row!.email)}&next=${encodeURIComponent(`/rejoindre/${token}`)}`} className="btn btn-secondary">J&apos;ai déjà un compte</Link>
            </div>
          </>
        ) : !mine ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Mauvais compte</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Cette invitation à rejoindre <strong>{name}</strong> est pour {row!.email}. Tu es connecté avec {user.email}. Connecte-toi avec l&apos;adresse invitée.
            </p>
            <Link href="/dashboard" className="btn btn-secondary mt-6">Retour</Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Rejoindre « {name} »</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Tu es invité comme {row!.role === "admin" ? "administrateur : tu gères les flux et les membres" : "membre : tu pilotes et tu regardes"}.
            </p>
            <JoinButton token={token} />
          </>
        )}
      </div>
    </main>
  );
}
