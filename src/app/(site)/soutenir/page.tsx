import type { Metadata } from "next";
import SupportSection from "@/components/landing/SupportSection";

export const metadata: Metadata = {
  title: "Me soutenir",
  description: "Mathis, développeur de SYXTEE NETWORKS : contribuer sur GitHub, suivre la chaîne YouTube syxtee ou rejoindre la communauté.",
  alternates: { canonical: "/soutenir" },
};

export default function SoutenirPage() {
  return (
    <div className="pt-16 lg:pt-24">
      <SupportSection />
    </div>
  );
}
