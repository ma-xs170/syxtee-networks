import type { Metadata } from "next";
import { AvatarForm, NamesForm } from "@/components/auth/AccountForms";
import Card from "@/components/compte/Card";
import { initials } from "@/lib/names";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Mon profil", robots: { index: false } };

export default async function ProfilPage() {
  await requireUser("/compte/profil");
  const profile = (await getProfile())!;
  return (
    <>
      <Card title="Photo de profil" text="Ton avatar apparaît dans le dashboard et, si tu l'autorises, sur l'accueil du site.">
        <AvatarForm url={profile.avatar_url} initials={initials(profile)} />
      </Card>
      <Card title="Prénom et nom" text="Ils ne sont jamais affichés publiquement sans ton accord (voir Réseaux et visibilité).">
        <NamesForm first={profile.first_name ?? ""} last={profile.last_name ?? ""} />
      </Card>
    </>
  );
}
