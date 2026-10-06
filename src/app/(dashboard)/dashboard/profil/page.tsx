import type { Metadata } from "next";
import { AvatarForm } from "@/components/auth/AccountForms";
import ProfileForm from "@/components/auth/ProfileForm";
import { DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { initials } from "@/lib/names";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Profil & réseaux", robots: { index: false } };

export default async function ProfilPage() {
  const user = await requireUser("/dashboard/profil");
  const profile = (await getProfile())!;
  return (
    <DashPage>
      <DashHeader lead="Profil &" hl="réseaux" sub="Ce que les viewers voient de toi sur le site SYXTEE." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tile>
          <TileLabel>Avatar</TileLabel>
          <div className="mt-4">
            <AvatarForm url={profile.avatar_url} initials={initials(profile)} />
          </div>
          <p className="mt-6 border-t border-line pt-4 text-sm text-muted">
            Connecté avec <span data-sensitive className="text-foreground">{user.email}</span>
          </p>
        </Tile>
        <Tile className="lg:col-span-2">
          <TileLabel>Profil</TileLabel>
          <div className="mt-4 max-w-xl">
            <ProfileForm profile={profile} mode="compte" next="/dashboard/profil" />
          </div>
        </Tile>
      </div>
    </DashPage>
  );
}
