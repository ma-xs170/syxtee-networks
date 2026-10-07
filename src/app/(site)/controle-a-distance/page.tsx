import type { Metadata } from "next";
import Link from "next/link";
import PhoneMockup from "@/components/PhoneMockup";
import RemoteObsMock from "@/components/mockups/RemoteObsMock";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contrôle à distance",
  description: "Pilote OBS depuis un onglet : scènes, sources, mixeur audio et direct, depuis ton téléphone ou n'importe quel navigateur.",
  alternates: { canonical: "/controle-a-distance" },
};

export default function ControlePage() {
  return (
    <section className="py-24 sm:py-28">
      <Container className="max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="h-hero">Pilote OBS depuis un onglet.</h1>
          <p className="mt-6 text-base leading-relaxed text-muted sm:text-lg">
            Change de scène depuis ton téléphone, au fond du jardin. Comme devant ton écran : aperçu du programme, sources, mixeur audio et
            contrôle du direct. Tout agit sur le vrai OBS de ton ordinateur.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/acces" className="btn btn-primary">Demander l&apos;accès</Link>
            <Link href="/application" className="btn btn-secondary">Mettre sur l&apos;écran d&apos;accueil</Link>
          </div>
        </div>
        <div className="relative mx-auto mt-16 max-w-4xl pb-12 pr-[22%]">
          <RemoteObsMock />
          <div className="absolute -bottom-2 right-0 w-[34%] max-w-[15rem]">
            <PhoneMockup src="/images/remote/controle-mobile.png" alt="Contrôle à distance sur téléphone : scènes, aperçu du programme et direct" sizes="240px" />
          </div>
        </div>
      </Container>
    </section>
  );
}
