import type { NextRequest } from "next/server";
import { appUser, privateJson, readJson } from "@/lib/auth/app-api";
import {
  archiveRelayAction,
  changeModeAction,
  changeServerAction,
  deleteRelayAction,
  renameRelayAction,
  setRecordAction,
  setRecordFormatAction,
  setSwitchTriggerAction,
} from "@/app/(dashboard)/dashboard/relais/actions";

type Ctx = { params: Promise<{ id: string }> };
const result = (r: { error?: string }) => (r.error ? privateJson({ error: r.error }, { status: 400 }) : privateJson({ ok: true }));

// PATCH /api/app/relays/:id : un seul champ à la fois, parmi
// name, switch_trigger, archived, server, mode, record, record_format (mêmes actions et mêmes droits que le site).
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const u = await appUser();
  if (u instanceof Response) return u;
  const { id } = await params;
  const b = (await readJson(request)) as Record<string, unknown> | null;
  if (!b) return privateJson({ error: "Corps invalide." }, { status: 400 });
  if (typeof b.name === "string") return result(await renameRelayAction(id, b.name));
  if (typeof b.switch_trigger === "string") return result(await setSwitchTriggerAction(id, b.switch_trigger as "cut" | "cut_lowbitrate" | "sensitive"));
  if (typeof b.archived === "boolean") return result(await archiveRelayAction(id, b.archived));
  if (typeof b.server === "string") return result(await changeServerAction(id, b.server));
  if (b.mode === "direct" || b.mode === "regie") return result(await changeModeAction(id, b.mode));
  if (typeof b.record === "boolean") return result(await setRecordAction(id, b.record));
  if (b.record_format === "mov" || b.record_format === "mp4") return result(await setRecordFormatAction(id, b.record_format));
  return privateJson({ error: "Aucun champ à modifier." }, { status: 400 });
}

// DELETE /api/app/relays/:id : supprime le relais.
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const u = await appUser();
  if (u instanceof Response) return u;
  return result(await deleteRelayAction((await params).id));
}
