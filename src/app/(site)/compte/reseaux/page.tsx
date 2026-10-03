import type { Metadata } from "next";
import Card from "@/components/compte/Card";
import ProfileForm from "@/components/auth/ProfileForm";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Réseaux et visibilité", robots: { index: false } };

export default async function ReseauxPage() {
  await requireUser("/compte/reseaux");
  const profile = (await getProfile())!;
  return (
    <Card title="Réseaux et visibilité" text="Ta région (heure et bonjour du dashboard), ta bio, tes réseaux, et ce que tu montres sur l'accueil du site.">
      <ProfileForm profile={profile} mode="compte" next="/compte/reseaux" />
    </Card>
  );
}
