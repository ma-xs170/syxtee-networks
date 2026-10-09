import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RemoteObs from "@/components/remote/RemoteObs";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { effectivePlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Contrôle à distance", robots: { index: false } };

// Interface d'OBS à distance, plein écran (sans barre latérale) : pensée pour le téléphone d'abord.
export default async function RemoteObsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireUser(`/controle-a-distance/${id}`);
  const profile = await getProfile();
  const plan = effectivePlan(profile);
  return <RemoteObs coreUrl={publicCoreUrl} deviceId={id} rights={{ prises: plan.regiePrises, cams: plan.regieCams }} chatDefaults={{ twitch: profile?.twitch_login || profile?.twitch || "", kick: profile?.kick ?? "", youtube: "" }} />;
}
