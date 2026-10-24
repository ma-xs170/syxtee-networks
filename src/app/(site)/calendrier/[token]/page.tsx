import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CalendarApp from "@/components/calendar/CalendarApp";
import { loadShared } from "@/lib/calendar-data";
import { SHARE_TOKEN } from "@/lib/calendar";

// Calendrier des lives partagé par un streamer : lecture seule, accessible à qui a le lien. Le jeton est le secret : page jamais indexée,
// aucun en-tête « referrer » n'est envoyé vers d'autres sites.
export const metadata: Metadata = { title: "Calendrier des lives", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function SharedCalendarPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!SHARE_TOKEN.test(token)) notFound();
  const shared = await loadShared(token).catch(() => null);
  if (!shared) notFound();
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <h1 className="h-serif mt-2 pb-1.5 text-[clamp(2rem,4.2vw,3.25rem)]">
        Les lives de <em>{shared.name}</em>
      </h1>
      <p className="mt-3 max-w-[65ch] text-sm leading-relaxed text-muted">Les prochains directs, avec leurs plateformes. Abonne-toi pour les retrouver dans ton agenda (Apple, Google, Outlook) : il se met à jour tout seul.</p>
      <div className="mt-8">
        <CalendarApp initial={shared.events} editable={false} shareToken={token} shared />
      </div>
    </main>
  );
}
