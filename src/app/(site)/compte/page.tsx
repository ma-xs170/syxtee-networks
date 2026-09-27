import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { AvatarForm, DeleteAccountForm } from "@/components/auth/AccountForms";
import ProfileForm from "@/components/auth/ProfileForm";
import { Container } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { authErrorMessage } from "@/lib/auth/errors";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false } };

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line py-10 md:grid-cols-[220px_minmax(0,1fr)]">
      <h2 className="text-base font-medium">{title}</h2>
      <div className="max-w-xl">{children}</div>
    </section>
  );
}

export default async function ComptePage({ searchParams }: PageProps<"/compte">) {
  const user = await requireUser("/compte");
  const profile = await getProfile();
  if (!profile) redirect("/connexion?erreur=oauth");
  if (!profile.onboarded_at) redirect("/bienvenue?next=/compte");
  const { erreur } = await searchParams;
  const error = authErrorMessage(typeof erreur === "string" ? erreur : null);

  return (
    <Container className="py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Mon compte</h1>
          <p className="mt-2 text-sm text-muted">{user.email}</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          Retour au dashboard →
        </Link>
      </div>
      {error && (
        <p role="alert" className="mt-6 text-sm text-red-400/90">
          {error}
        </p>
      )}

      <div className="mt-10">
        <Block title="Avatar">
          <AvatarForm url={profile.avatar_url} name={profile.username ?? "?"} />
        </Block>
        <Block title="Profil">
          <ProfileForm profile={profile} mode="compte" />
        </Block>
        <Block title="Session">
          <form action={signOut}>
            <button type="submit" className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-sm font-medium hover:bg-white/[0.08]">
              Déconnexion
            </button>
          </form>
        </Block>
        <Block title="Supprimer mon compte">
          <DeleteAccountForm />
        </Block>
      </div>
    </Container>
  );
}
