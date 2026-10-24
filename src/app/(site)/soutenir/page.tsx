import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import SupportSection from "@/components/landing/SupportSection";

export const metadata: Metadata = {
  title: "Me soutenir",
  description: "Mathis, développeur de SYXTEE NETWORKS : contribuer sur GitHub, suivre la chaîne YouTube syxtee ou rejoindre la communauté.",
  alternates: { canonical: "/soutenir" },
};

export default function SoutenirPage() {
  return (
    <>
      <PageHero title={<>Me <em>soutenir.</em></>} crumb="Soutenir">
        Un projet fait seul, depuis la Guadeloupe, et ouvert à tous.
      </PageHero>
      <SupportSection />
    </>
  );
}
