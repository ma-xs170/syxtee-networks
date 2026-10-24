import type { Metadata } from "next";
import CalendarApp from "@/components/calendar/CalendarApp";
import { DashPage } from "@/components/dashboard/ui";
import { getShareToken, listEvents } from "@/lib/calendar-data";
import { canManage, getActiveWorkspace, loadMembers, requireOwner } from "@/lib/workspace";

export const metadata: Metadata = { title: "Calendrier des lives", robots: { index: false } };

export default async function CalendarPage() {
  const owner = await requireOwner("/dashboard/calendrier");
  const [events, token, ws] = await Promise.all([listEvents(owner.id), getShareToken(owner.id), getActiveWorkspace()]);
  const team = ws ? (await loadMembers(ws.id)).members.map((m) => ({ id: m.user_id, name: m.name, kind: m.kind })) : [];
  return (
    <DashPage className="max-w-[1400px]">
      <h1 className="sr-only">Calendrier des lives</h1>
      <CalendarApp initial={events} editable={canManage(owner.workspace)} shareToken={token} team={team} />
    </DashPage>
  );
}
