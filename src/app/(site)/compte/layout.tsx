import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import CompteNav from "@/components/compte/CompteNav";
import MobileBack from "@/components/compte/MobileBack";
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
    <Container className="py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:py-16">
      <header className="flex items-center gap-4">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={64} height={64} className="size-14 shrink-0 rounded-full border border-foreground/25 object-cover sm:size-16" />
        ) : (
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full border border-foreground/25 bg-foreground/[0.12] font-mono text-lg uppercase sm:size-16">
            {name.slice(0, 2)}
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
          <p data-sensitive className="mt-0.5 truncate text-sm text-muted">{user.email}</p>
          <Link href="/dashboard/abonnement" className="mt-2 inline-flex min-h-7 items-center rounded-full border border-line px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-foreground">
            {plan.name}
          </Link>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:mt-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <CompteNav />
        <div className="min-w-0">
          <MobileBack />
          <div className="space-y-6">{children}</div>
        </div>
      </div>
    </Container>
  );
}
