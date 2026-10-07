import Link from "next/link";
import { redirect } from "next/navigation";
import CompteNav from "@/components/compte/CompteNav";
import { Container } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getPlan } from "@/lib/auth/plan";

// Mon compte : en-tête (avatar, nom, email, formule) et menu ; chaque section est sa propre page.
export default async function CompteLayout({ children }: LayoutProps<"/compte">) {
  const user = await requireUser("/compte");
  const profile = await getProfile();
  if (!profile) redirect("/connexion?erreur=oauth");
  if (!profile.onboarded_at) redirect("/bienvenue?next=/compte");
  const plan = await getPlan();
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.twitch_display_name || "Mon compte";

  return (
    <Container className="py-12 sm:py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Mon compte</h1>
        <p className="mt-2 text-sm text-muted">
          {name} · <span data-sensitive>{user.email}</span> ·{" "}
          <Link href="/dashboard/abonnement" className="underline underline-offset-4 hover:text-foreground">Abonnement {plan.name}</Link>
        </p>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <CompteNav />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </Container>
  );
}
