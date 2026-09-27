import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Dashboard : vide pour l'instant (clés de stream, santé du flux et contrôle caméra arrivent avec SYXTEE Core).
export default async function DashboardPage() {
  await requireUser("/dashboard");
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/bienvenue");

  return (
    <Container className="py-16 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Salut {profile.username}.</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        Ton espace SYXTEE est prêt. Tes clés de stream, la santé de ton flux et le contrôle de ta caméra arriveront ici.
      </p>
      <div className="mt-10 rounded-2xl border border-dashed border-line p-8 sm:p-10">
        <p className="text-sm text-muted">En attendant, complète ton profil et lie ton Twitch pour apparaître sur l&apos;accueil.</p>
        <Link href="/compte" className="mt-5 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-medium text-black hover:bg-neutral-200">
          Mon compte
        </Link>
      </div>
    </Container>
  );
}
