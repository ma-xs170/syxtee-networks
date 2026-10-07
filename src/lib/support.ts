import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient, hasAdmin } from "@/lib/supabase/admin";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, SUPPORT_CATEGORIES, isCategory, type SupportCategory } from "@/lib/support-categories";

// Support : requêtes partagées entre l'espace client et l'espace admin. Tout passe par la clé secrète, après que
// l'appelant a vérifié le propriétaire (client) ou le rôle (admin).

export type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "resolved";
  created_at: string;
  updated_at: string;
  first_reply_at: string | null;
  resolved_at: string | null;
  last_from: "user" | "staff";
  category: SupportCategory;
  /** Agent qui a pris en charge la demande (0047_staff.sql). */
  assigned_to: string | null;
  assigned_at: string | null;
};
export type Attachment = { path: string; name: string };
export type TicketMessage = { id: string; ticket_id: string; author_id: string | null; from_staff: boolean; body: string; created_at: string; attachments: Attachment[]; photos: { url: string; name: string }[]; kind: "message" | "system"; signature: string | null };

const BASE_COLS = "id, user_id, subject, status, created_at, updated_at, first_reply_at, resolved_at, last_from, category";
const COLS = `${BASE_COLS}, assigned_to, assigned_at`;
const MSG_BASE = "id, ticket_id, author_id, from_staff, body, created_at, attachments";
/** Colonne absente (migration 0047 pas encore appliquée) : la requête est refaite avec les colonnes d'avant, sans casser le support. */
const missingColumn = (e: { code?: string } | null) => e?.code === "42703";

export async function listTickets(opts: { userId?: string; state?: "open" | "resolved" | "all"; limit?: number } = {}): Promise<Ticket[]> {
  if (!hasAdmin) return [];
  const run = (cols: string) => {
    let q = createAdminClient().from("support_tickets").select(cols).order("updated_at", { ascending: false }).limit(opts.limit ?? 100);
    if (opts.userId) q = q.eq("user_id", opts.userId);
    if (opts.state === "open" || opts.state === "resolved") q = q.eq("status", opts.state);
    return q;
  };
  let { data, error } = await run(COLS);
  if (missingColumn(error)) ({ data, error } = await run(BASE_COLS));
  if (error) {
    console.error("support_tickets", error.message);
    return [];
  }
  return ((data ?? []) as unknown as Ticket[]).map((t) => ({ ...t, assigned_to: t.assigned_to ?? null, assigned_at: t.assigned_at ?? null }));
}

export async function ticketCounts(userId?: string): Promise<{ open: number; resolved: number }> {
  const all = await listTickets({ userId, state: "all", limit: 500 });
  return { open: all.filter((t) => t.status === "open").length, resolved: all.filter((t) => t.status === "resolved").length };
}

/** Ticket et messages ; `userId` : seulement si le ticket lui appartient (espace client). */
export async function getThread(id: string, userId?: string): Promise<{ ticket: Ticket; messages: TicketMessage[] } | null> {
  if (!hasAdmin || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = createAdminClient();
  const find = (cols: string) => {
    let q = db.from("support_tickets").select(cols).eq("id", id);
    if (userId) q = q.eq("user_id", userId);
    return q.maybeSingle();
  };
  let { data: ticket, error: ticketError } = await find(COLS);
  if (missingColumn(ticketError)) ({ data: ticket } = await find(BASE_COLS));
  if (!ticket) return null;
  const first = await db.from("support_messages").select(`${MSG_BASE}, kind, signature`).eq("ticket_id", id).order("created_at");
  const messages: unknown[] | null = missingColumn(first.error) ? (await db.from("support_messages").select(MSG_BASE).eq("ticket_id", id).order("created_at")).data : first.data;
  const rows = ((messages ?? []) as unknown as (Omit<TicketMessage, "photos" | "kind" | "signature"> & { attachments: Attachment[] | null; kind?: "message" | "system"; signature?: string | null })[]).map((m) => ({ ...m, kind: m.kind ?? "message", signature: m.signature ?? null }));
  // Photos : URLs signées d'une heure (bucket privé), seulement pour ce ticket (chemins préfixés par son identifiant).
  const paths = rows.flatMap((m) => (m.attachments ?? []).map((a) => a.path)).filter((x) => x.startsWith(`${id}/`));
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await db.storage.from("support").createSignedUrls(paths, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  return {
    ticket: { ...(ticket as unknown as Ticket), assigned_to: (ticket as unknown as Ticket).assigned_to ?? null, assigned_at: (ticket as unknown as Ticket).assigned_at ?? null },
    messages: rows.map((m) => ({ ...m, attachments: m.attachments ?? [], photos: (m.attachments ?? []).flatMap((a) => (signed.has(a.path) ? [{ url: signed.get(a.path)!, name: a.name }] : [])) })),
  };
}

/** Ajoute un message au fil. `kind` « system » : ligne d'information (prise en charge). Réessaie sans les colonnes de 0047 si elle n'est pas appliquée. */
export async function addMessage(row: { ticket_id: string; author_id: string | null; from_staff: boolean; body: string; attachments?: Attachment[]; kind?: "message" | "system"; signature?: string | null }) {
  const db = createAdminClient();
  const full = await db.from("support_messages").insert({ attachments: [], kind: "message", signature: null, ...row });
  if (!missingColumn(full.error)) return full.error;
  const { kind, signature, ...old } = { attachments: [] as Attachment[], ...row };
  void kind;
  void signature;
  return (await db.from("support_messages").insert(old)).error;
}

/** Texte du premier message automatique d'un nouveau ticket, tant qu'aucun agent ne l'a pris en charge. */
export const WAITING_AGENT_TEXT = "Merci, nous vous recherchons un support pour prendre en charge votre demande.";

/** « Prénom N. » de chaque compte, pour la boîte de réception admin. */
export async function whoIs(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!hasAdmin || ids.length === 0) return out;
  const { data } = await createAdminClient().from("profiles").select("id, first_name, last_name, twitch_display_name, support_id").in("id", [...new Set(ids)]);
  for (const p of data ?? []) {
    const name = [p.first_name, p.last_name?.charAt(0) ? `${p.last_name.charAt(0)}.` : ""].filter(Boolean).join(" ") || p.twitch_display_name || p.support_id || "Compte";
    out.set(p.id as string, name);
  }
  return out;
}

/** Demandes à répondre (ouvertes, dernier mot du client), au total et par catégorie : pastilles du menu admin. */
export async function supportBadges(): Promise<{ all: number; byCategory: Record<SupportCategory, number> }> {
  const byCategory = Object.fromEntries(SUPPORT_CATEGORIES.map((c) => [c.id, 0])) as Record<SupportCategory, number>;
  if (!hasAdmin) return { all: 0, byCategory };
  const { data } = await createAdminClient().from("support_tickets").select("category").eq("status", "open").eq("last_from", "user").limit(1000);
  for (const t of data ?? []) if (isCategory(t.category)) byCategory[t.category]++;
  return { all: Object.values(byCategory).reduce((a, b) => a + b, 0), byCategory };
}

const SIGNATURES: [string, number[]][] = [
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47]],
  ["image/gif", [0x47, 0x49, 0x46, 0x38]],
];
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };

/** Vérifie le vrai format du fichier (pas seulement le type annoncé) : JPEG, PNG, GIF ou WebP. */
function sniff(buf: Buffer): string | null {
  for (const [mime, sig] of SIGNATURES) if (sig.every((b, i) => buf[i] === b)) return mime;
  if (buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

/** Envoie les photos d'un formulaire dans le bucket privé « support » ; renvoie les pièces jointes ou un message d'erreur. */
export async function savePhotos(ticketId: string, form: FormData): Promise<{ attachments: Attachment[] } | { error: string }> {
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { attachments: [] };
  if (files.length > MAX_PHOTOS) return { error: `${MAX_PHOTOS} photos au plus par message.` };
  const db = createAdminClient();
  const out: Attachment[] = [];
  for (const f of files) {
    if (f.size > MAX_PHOTO_BYTES) return { error: "Une photo dépasse 4 Mo." };
    const buf = Buffer.from(await f.arrayBuffer());
    const mime = sniff(buf);
    if (!mime) return { error: "Formats acceptés : JPEG, PNG, WebP ou GIF." };
    const path = `${ticketId}/${randomUUID()}.${EXT[mime]}`;
    const { error } = await db.storage.from("support").upload(path, buf, { contentType: mime, upsert: false });
    if (error) {
      console.error("support photo", error.message);
      return { error: "Envoi de la photo impossible pour le moment." };
    }
    out.push({ path, name: f.name.slice(0, 80) });
  }
  return { attachments: out };
}

/** Supprime un ticket, ses messages (cascade) et ses photos du stockage. L'appelant a déjà vérifié le droit de le faire. */
export async function deleteTicket(ticketId: string): Promise<boolean> {
  if (!hasAdmin || !/^[0-9a-f-]{36}$/i.test(ticketId)) return false;
  const db = createAdminClient();
  const { data: msgs } = await db.from("support_messages").select("attachments").eq("ticket_id", ticketId);
  const paths = (msgs ?? []).flatMap((m) => ((m.attachments ?? []) as Attachment[]).map((a) => a.path)).filter((p) => p.startsWith(`${ticketId}/`));
  if (paths.length) await db.storage.from("support").remove(paths);
  const { error } = await db.from("support_tickets").delete().eq("id", ticketId);
  if (error) console.error("support delete", error.message);
  return !error;
}
