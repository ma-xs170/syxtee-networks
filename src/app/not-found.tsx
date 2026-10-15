import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import StatusPage from "@/components/StatusPage";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Nav />
      <main id="contenu" className="flex flex-1 flex-col">
        <StatusPage
          code="404"
          title="Cette page a perdu le signal."
          actions={
            <>
              <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
              <ButtonLink href="/contact" variant="ghost">Nous écrire</ButtonLink>
            </>
          }
        >
          L&apos;adresse n&apos;existe pas ou a été déplacée. Vérifie le lien, ou repars de l&apos;accueil.
        </StatusPage>
      </main>
      <Footer />
    </>
  );
}
