import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import KeyPanel, { CreateKeys } from "@/components/dashboard/KeyPanel";
import StreamHealth from "@/components/dashboard/StreamHealth";
import StreamPreview from "@/components/dashboard/StreamPreview";
import { Container } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { getStreamKeys, hasCore, publicCoreUrl, type StreamKeys } from "@/lib/core";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Dashboard : URLs Moblin / OBS (clés de stream du SYXTEE Core), santé du flux en direct et aperçu.
export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const profile = await getProfile();
  if (!profile?.onboarded_at) redirect("/bienvenue");

  let keys: StreamKeys | null = null;
  let coreDown = false;
  if (hasCore) {
    try {
      keys = await getStreamKeys(user.id);
    } catch (e) {
      console.error("dashboard : Core", e);
      coreDown = true;
    }
  }

  return (
    <Container className="py-16 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Salut {profile.username}.</h1>
          <p className="mt-2 text-base text-muted">Tes URLs de stream, la santé de ton flux et l&apos;aperçu en direct.</p>
        </div>
        <Link href="/compte" className="text-sm text-muted hover:text-foreground">
          Mon compte →
        </Link>
      </div>

      {!hasCore || coreDown ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-8">
          <p className="text-sm text-muted">
            {coreDown ? "Le relais ne répond pas pour le moment. Réessaie dans quelques minutes." : "Le relais n'est pas encore branché au dashboard. Tes URLs arrivent ici très bientôt."}
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>{keys ? <KeyPanel key={keys.moblin_srtla_url} keys={keys} /> : <CreateKeys />}</div>
          {keys && (
            <div className="space-y-6">
              <StreamPreview coreUrl={publicCoreUrl} />
              <StreamHealth coreUrl={publicCoreUrl} />
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
