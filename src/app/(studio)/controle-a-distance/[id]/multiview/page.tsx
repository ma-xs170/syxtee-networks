import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Multiview from "@/components/remote/Multiview";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { publicCoreUrl } from "@/lib/core";
import { can, effectivePlan } from "@/lib/plans";

export const metadata: Metadata = { title: "Multiview", robots: { index: false } };

// Multiview d'OBS dans une page à part (second écran) : mêmes droits que le contrôle à distance.
export default async function MultiviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireUser(`/controle-a-distance/${id}/multiview`);
  const plan = effectivePlan(await getProfile());
  if (!can(plan, "remote")) redirect("/dashboard/abonnement");
  return <Multiview coreUrl={publicCoreUrl} deviceId={id} rights={{ prises: plan.regiePrises, cams: plan.regieCams }} />;
}
