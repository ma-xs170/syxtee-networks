import type { Metadata } from "next";
import SailySection from "@/components/partners/SailySection";
import SailyStory from "@/components/saily/SailyStory";

export const metadata: Metadata = {
  title: "Saily : une 4G de plus en eSIM",
  description:
    "Ajoute une 2e 4G à ton bonding Moblin : une eSIM data Saily sur un 2e téléphone Android avec Moblink. Tutoriel en 5 étapes et code promo SYXTEE26.",
  alternates: { canonical: "/saily" },
};

export default function SailyPage() {
  return (
    <>
      <SailyStory />
      <SailySection header="compact" />
    </>
  );
}
