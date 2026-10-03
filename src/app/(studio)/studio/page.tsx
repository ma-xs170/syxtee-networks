import type { Metadata } from "next";
import Studio from "@/components/studio/Studio";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";

export const metadata: Metadata = { title: "SYXTEE STUDIO", robots: { index: false } };

// SYXTEE STUDIO : l'interface d'OBS sur le site. Chaque bouton agit à distance sur l'OBS de l'utilisateur (plugin SYXTEE Link).
export default async function StudioPage() {
  await requireUser("/studio");
  const profile = await getProfile();
  return <Studio coreUrl={publicCoreUrl} chat={{ twitch: profile?.twitch_login ?? "", kick: profile?.kick ?? "", youtube: "" }} />;
}
