import type { Metadata } from "next";
import CalendarApp from "@/components/calendar/CalendarApp";
import { DashPage } from "@/components/dashboard/ui";
import { getShareToken, listEvents } from "@/lib/calendar-data";
import { canManage, requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Calendrier des lives", robots: { index: false } };

export default async function CalendarPage() {
  const owner = await requireOwner("/dashboard/calendrier");
  const [events, token] = await Promise.all([listEvents(owner.id), getShareToken(owner.id)]);
  return (
    <DashPage className="max-w-[1400px]">
      <h1 className="sr-only">Calendrier des lives</h1>
      <CalendarApp initial={events} editable={canManage(owner.workspace)} shareToken={token} />
    </DashPage>
  );
}
