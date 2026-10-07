import type { Metadata } from "next";
import Link from "next/link";
import PhoneMockup from "@/components/PhoneMockup";
import InstallGuide from "@/components/pwa/InstallGuide";
import { Container } from "@/components/ui";

export const metadata: Metadata = {
  title: "Mets SYXTEE sur ton écran d'accueil",
  description: "Ajoute SYXTEE à l'écran d'accueil de ton téléphone : le contrôle à distance d'OBS en un toucher, en plein écran, écran toujours allumé.",
  alternates: { canonical: "/application" },
};

const POINTS: { title: string; text: string }[] = [
  { title: "Un toucher", text: "L'icône SYXTEE est avec tes autres apps. Tu ouvres, tu pilotes." },
  { title: "Plein écran", text: "Plus de barre d'adresse : l'aperçu, les scènes et le mixeur prennent toute la place." },
  { title: "Écran allumé", text: "Il ne s'éteint pas tant que le contrôle est ouvert, même téléphone posé." },
  { title: "Raccourcis", text: "Appui long sur l'icône : Contrôle à distance ou Mes flux, directement." },
];

export default function ApplicationPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-5xl">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
          <div>
            <h1 className="h-hero">Mets SYXTEE sur ton écran d&apos;accueil.</h1>
            <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">
              Le contrôle à distance d&apos;OBS comme une vraie app, sans rien télécharger sur un magasin d&apos;applications. Ça prend dix secondes.
            </p>
            <div className="mt-10">
              <InstallGuide />
            </div>
          </div>
          <div className="mx-auto w-full max-w-[16rem]">
            <PhoneMockup src="" screen="scenes" alt="Contrôle à distance sur téléphone : scènes, aperçu du programme et direct" />
          </div>
        </div>

        <ul className="mt-20 grid grid-cols-1 gap-x-10 gap-y-8 border-t border-line pt-12 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li key={p.title}>
              <h2 className="text-lg font-semibold tracking-tight">{p.title}</h2>
              <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted">{p.text}</p>
            </li>
          ))}
        </ul>

        <p className="mt-14 text-sm text-muted">
          Pas encore de compte ? <Link href="/acces" className="text-foreground underline underline-offset-4">Demander l&apos;accès</Link>, puis reviens ici depuis ton téléphone.
        </p>
      </Container>
    </section>
  );
}
