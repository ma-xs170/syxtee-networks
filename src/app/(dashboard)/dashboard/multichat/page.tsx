import type { Metadata } from "next";
import MultiChat from "@/components/dashboard/MultiChat";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Multichat", robots: { index: false } };

// Multichat : Twitch et Kick dans un seul fil, chat YouTube en onglet. Chaînes reprises du profil.
export default async function MultichatPage() {
  await requireUser("/dashboard/multichat");
  const profile = await getProfile();
  return (
    <DashPage>
      <DashHeader lead="Tous tes chats," hl="un seul fil" sub="Twitch et Kick dans la même liste, YouTube dans son onglet. Lecture seule : on lit, on ne répond pas ici." />
      <MultiChat defaults={{ twitch: profile?.twitch_login ?? "", kick: profile?.kick ?? "", youtube: "" }} height="h-[max(28rem,calc(100dvh-16rem))]" />
    </DashPage>
  );
}
