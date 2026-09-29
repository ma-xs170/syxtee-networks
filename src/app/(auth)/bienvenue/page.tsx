import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/auth/ProfileForm";
import { getProfile, requireUser, safeNext } from "@/lib/auth/dal";
import { authErrorMessage } from "@/lib/auth/errors";

export const metadata: Metadata = { title: "Bienvenue", robots: { index: false } };

// Première connexion : réseaux sociaux et consentement pour l'accueil.
export default async function BienvenuePage({ searchParams }: PageProps<"/bienvenue">) {
  await requireUser("/bienvenue");
  const { next, erreur } = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect("/connexion?erreur=oauth");
  if (profile.onboarded_at) redirect(safeNext(typeof next === "string" ? next : null));
  const error = authErrorMessage(typeof erreur === "string" ? erreur : null);

  return (
    <div className="w-full max-w-[480px]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/10 bg-[#0a0a0a] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-8px_16px_rgba(0,0,0,0.6)]">
        <Image src="/logo-400.png" alt="SYXTEE" width={18} height={25} priority />
      </div>
      <h1 className="mt-8 text-center text-3xl font-semibold tracking-tight">Bienvenue sur SYXTEE</h1>
      <p className="mt-3 text-center text-sm text-white/60">Ajoute tes réseaux. Tu pourras tout modifier plus tard.</p>
      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-red-400/90">
          {error}
        </p>
      )}
      <div className="mt-10">
        <ProfileForm profile={profile} mode="bienvenue" next={typeof next === "string" ? safeNext(next) : "/dashboard"} />
      </div>
    </div>
  );
}
