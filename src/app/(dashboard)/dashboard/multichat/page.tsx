import type { Metadata } from "next";
import MultiChat from "@/components/dashboard/MultiChat";
import { DashHeader, DashPage } from "@/components/dashboard/ui";
import PlanGate from "@/components/plans/PlanGate";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Multichat", robots: { index: false } };

// Multichat : Twitch et Kick dans un seul fil, chat YouTube en onglet. Chaînes reprises du profil.
const NOTICES: Record<string, string> = {
  "-indisponible": "n'est pas encore activé sur ce site.",
  "-refuse": "a été refusé : rien n'a été relié.",
  "-etat": "n'a pas pu être vérifié. Réessaie.",
  "-echec": "n'a pas pu être relié. Réessaie dans un instant.",
};

export default async function MultichatPage({ searchParams }: PageProps<"/dashboard/multichat">) {
  const [{ chat, chat_erreur: err }, , profile] = await Promise.all([searchParams, requireUser("/dashboard/multichat"), getProfile()]);
  const label = (p: string) => ({ twitch: "Twitch", kick: "Kick", youtube: "YouTube" })[p] ?? p;
  const notice =
    typeof chat === "string"
      ? `${label(chat)} relié : tu peux écrire dans le chat.`
      : typeof err === "string"
        ? (() => {
            const [p, ...rest] = err.split("-");
            return `${label(p)} ${NOTICES[`-${rest.join("-")}`] ?? "n'a pas pu être relié."}`;
          })()
        : undefined;
  return (
    <DashPage>
      <DashHeader lead="Tous tes chats," hl="un seul fil" sub="Un clic sur un logo affiche une plateforme ou plusieurs : YouTube, Twitch et Kick. Relie ton compte (roue) pour écrire dans le chat." />
      <PlanGate feature="relais">
      <MultiChat defaults={{ twitch: profile?.twitch_login || profile?.twitch || "", kick: profile?.kick ?? "", youtube: "" }} height="h-[max(28rem,calc(100dvh-16rem))]" notice={notice} />
      </PlanGate>
    </DashPage>
  );
}
