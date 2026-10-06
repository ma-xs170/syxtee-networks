import type { Metadata } from "next";
import LinkApprove from "@/components/studio/LinkApprove";
import { Container } from "@/components/ui";
import { requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "Connecter OBS", robots: { index: false } };

// Page ouverte par le plugin SYXTEE Link (dans OBS) : l'utilisateur, connecté à son compte, confirme le code affiché dans OBS.
export default async function LinkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { code } = await searchParams;
  const clean = typeof code === "string" ? code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) : "";
  const user = await requireUser(clean ? `/link?code=${clean}` : "/link");
  return (
    <section className="flex min-h-[70dvh] items-center py-24">
      <Container className="max-w-xl">
        <LinkApprove code={clean} coreUrl={publicCoreUrl} email={user.email ?? ""} />
      </Container>
    </section>
  );
}
