import Link from "next/link";
import { signOut } from "@/app/(auth)/actions";
import { redirect } from "next/navigation";
import CompteNav from "@/components/compte/CompteNav";
import { Container } from "@/components/ui";
import { initials } from "@/lib/names";
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
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full border border-line object-cover" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 text-xl font-semibold uppercase text-muted">{initials(profile)}</span>
          )}
          <div className="min-w-0">
            <p className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{name}</p>
            <p data-sensitive className="mt-0.5 truncate text-sm text-muted">
              {user.email}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/abonnement" className="rounded-full border border-line px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground">
            Abonnement : {plan.name}
          </Link>
          <Link href="/dashboard" className="inline-flex h-10 items-center rounded-full border border-line-strong px-5 text-sm font-medium transition-colors hover:bg-foreground/10">
            Dashboard
          </Link>
          <form action={signOut}>
            <button type="submit" className="inline-flex h-10 items-center rounded-full border border-line px-5 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <CompteNav />
        <div className="min-w-0 space-y-6">{children}</div>
      </div>
    </Container>
  );
}
