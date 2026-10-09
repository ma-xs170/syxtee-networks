"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { passwordChanged, resetPassword, staffMessage } from "@/emails/templates";
import { passwordProblem } from "@/lib/auth/password";
import { sendEmailResult } from "@/lib/email/send";
import { addMessage } from "@/lib/support";
import { site } from "@/lib/site";
import { CoreOutdated, CoreRefusal, createRelay, deleteAllRelays, deleteCoverage, deleteRelay, hasCore, listRelays, refreshCore, rotateRelay, updateRelay } from "@/lib/core";
import { audit, offerPaidDays, setPlan } from "@/lib/plan-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSIGNABLE, effectivePlan, relayLimit, type PlanId } from "@/lib/plans";
import { serverById } from "@/lib/relay-servers";

// Fiche compte (admin) : formule, identité, clés, suspension, suppression, notes. Chaque action va au journal d'audit.

export type PlanState = { ok?: string; error?: string };

const planInput = z.object({
  userId: z.uuid(),
  plan: z.enum(ASSIGNABLE as [PlanId, ...PlanId[]]),
  until: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide.")
    .transform((v) => (v ? new Date(`${v}T23:59:59+02:00`) : null))
    .refine((d) => !d || d.getTime() > Date.now(), "La date d'expiration doit être dans le futur."),
  note: z
    .string()
    .trim()
    .max(200, "Note : 200 caractères au plus.")
    .transform((v) => v || null),
});

export async function setPlanAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const parsed = planInput.safeParse({ userId: form.get("userId"), plan: form.get("plan"), until: form.get("until") ?? "", note: form.get("note") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { userId, plan, until, note } = parsed.data;
  try {
    if (!(await setPlan(admin.email!, userId, { plan, until: plan === "free" ? null : until, note }))) return { error: "Compte introuvable." };
  } catch (e) {
    console.error("setPlanAction", e);
    return { error: "Enregistrement impossible." };
  }
  revalidatePath("/admin/comptes");
  revalidatePath("/admin/partenaires");
  return { ok: "Formule enregistrée. Le client a reçu un email." };
}

// ───────────── Fiche compte : identité, clés, suspension, suppression, notes ─────────────

const uid = z.uuid();
const nameField = (label: string) => z.string().trim().min(1, `${label} obligatoire.`).max(50, `${label} : 50 caractères au plus.`);

function done(userId: string) {
  revalidatePath(`/admin/comptes/${userId}`);
  revalidatePath("/admin/comptes");
}

/** Prénom, nom, email (l'email est changé directement, sans lien de confirmation : action admin tracée). */
export async function updateIdentityAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const parsed = z
    .object({ userId: uid, first_name: nameField("Prénom"), last_name: nameField("Nom"), email: z.string().trim().toLowerCase().pipe(z.email("Email invalide.")) })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  const { userId, first_name, last_name, email } = parsed.data;
  const db = createAdminClient();
  const [{ data: before }, { data: u }] = await Promise.all([
    db.from("profiles").select("first_name, last_name").eq("id", userId).maybeSingle(),
    db.auth.admin.getUserById(userId),
  ]);
  if (!before || !u.user) return { error: "Compte introuvable." };
  if (email !== u.user.email) {
    const { error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return { error: error.code === "email_exists" ? "Cet email est déjà utilisé par un autre compte." : "Changement d'email impossible." };
  }
  const { error } = await db.from("profiles").update({ first_name, last_name }).eq("id", userId);
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, "account.identity", userId, { ...before, email: u.user.email }, { first_name, last_name, email });
  done(userId);
  return { ok: "Identité enregistrée." };
}

/** Clés : « regenerate » = nouvelle clé pour chaque relais (coupe les flux) ; « revoke » = archive tous les relais. */
export async function keysAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const userId = uid.safeParse(form.get("userId"));
  const mode = form.get("mode");
  if (!userId.success || (mode !== "regenerate" && mode !== "revoke")) return { error: "Requête invalide." };
  if (!hasCore) return { error: "Core non configuré." };
  try {
    const relays = (await listRelays(userId.data)).filter((r) => !r.archived);
    for (const r of relays) {
      if (mode === "regenerate") await rotateRelay(userId.data, r.id);
      else await updateRelay(userId.data, r.id, { archived: true });
    }
    await audit(admin.email!, mode === "regenerate" ? "keys.regenerate" : "keys.revoke", userId.data, null, { relays: relays.map((r) => r.id) });
    done(userId.data);
    return { ok: mode === "regenerate" ? `${relays.length} clé(s) régénérée(s).` : `${relays.length} relais archivé(s).` };
  } catch (e) {
    console.error("keysAction", e);
    return { error: e instanceof CoreRefusal ? `Refusé par le relais : ${e.code}` : "Le relais ne répond pas." };
  }
}

/** « Couper le flux » d'un relais (abus) : nouvelle clé, le publieur est coupé dans la seconde. */
export async function cutRelayAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const p = z.object({ userId: uid, relayId: uid }).safeParse({ userId: form.get("userId"), relayId: form.get("relayId") });
  if (!p.success) return { error: "Requête invalide." };
  try {
    await rotateRelay(p.data.userId, p.data.relayId);
  } catch (e) {
    console.error("cutRelayAction", e);
    return { error: "Le relais ne répond pas." };
  }
  await audit(admin.email!, "relay.cut", p.data.userId, null, { relay: p.data.relayId });
  revalidatePath("/admin/relais");
  done(p.data.userId);
  return { ok: "Flux coupé : nouvelle clé générée." };
}

export async function suspendAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const suspend = form.get("suspend") === "1";
  const db = createAdminClient();
  const { data: before } = await db.from("profiles").select("suspended_at").eq("id", userId.data).maybeSingle();
  if (!before) return { error: "Compte introuvable." };
  const suspended_at = suspend ? new Date().toISOString() : null;
  const { error } = await db.from("profiles").update({ suspended_at }).eq("id", userId.data);
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, suspend ? "account.suspend" : "account.reactivate", userId.data, before, { suspended_at });
  if (hasCore) await refreshCore().catch((e) => console.error("refreshCore", e));
  done(userId.data);
  return { ok: suspend ? "Compte suspendu : ses flux sont coupés." : "Compte réactivé." };
}

/** Suppression définitive : il faut retaper l'ID support du compte. */
export async function deleteAccountAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("support_id, first_name, last_name, plan").eq("id", userId.data).maybeSingle();
  if (!p) return { error: "Compte introuvable." };
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== p.support_id) return { error: `Tape ${p.support_id} pour confirmer.` };
  if (hasCore) {
    try {
      await deleteAllRelays(userId.data);
      await deleteCoverage(userId.data);
    } catch (e) {
      console.error("deleteAccountAction : Core", e);
    }
  }
  const { data: files } = await db.storage.from("avatars").list(userId.data);
  if (files?.length) await db.storage.from("avatars").remove(files.map((f) => `${userId.data}/${f.name}`));
  const { error } = await db.auth.admin.deleteUser(userId.data);
  if (error) return { error: "Suppression impossible." };
  await audit(admin.email!, "account.delete", userId.data, p, null);
  revalidatePath("/admin/comptes");
  redirect("/admin/comptes?supprime=1");
}

export async function addNoteAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const p = z.object({ userId: uid, body: z.string().trim().min(1, "Note vide.").max(2000) }).safeParse({ userId: form.get("userId"), body: form.get("body") });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Note invalide." };
  const { error } = await createAdminClient().from("admin_notes").insert({ user_id: p.data.userId, author: admin.email!, body: p.data.body });
  if (error) return { error: "Enregistrement impossible." };
  await audit(admin.email!, "account.note", p.data.userId, null, { body: p.data.body });
  done(p.data.userId);
  return { ok: "Note ajoutée." };
}

export async function offerDaysAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const parsed = z.object({ userId: z.uuid(), days: z.coerce.number().int().min(1).max(365) }).safeParse({ userId: form.get("userId"), days: form.get("days") });
  if (!parsed.success) return { error: "Nombre de jours invalide (1 à 365)." };
  try {
    if (!(await offerPaidDays(admin.email!, parsed.data.userId, parsed.data.days))) return { error: "Compte introuvable." };
  } catch (e) {
    console.error("offerDaysAction", e);
    return { error: "Enregistrement impossible." };
  }
  revalidatePath("/admin/comptes");
  return { ok: `${parsed.data.days} jours de Signature offerts.` };
}

// ───────────── Relais d'un compte (créer, renommer, archiver, supprimer, clés, enregistrement) ─────────────

const relayRefusal = (e: unknown) =>
  e instanceof CoreOutdated
    ? "Le serveur relais n'est pas à jour."
    : e instanceof CoreRefusal
    ? e.code === "quota"
      ? "Limite de relais de la formule atteinte : change d'abord la formule du compte."
      : e.code === "forbidden"
        ? "Compte suspendu ou formule sans relais : change d'abord sa formule."
        : e.code === "rtmp_disabled" || e.code === "rist_disabled"
          ? "Ce protocole n'est pas ouvert sur le serveur."
          : e.code === "rist_ports_full"
            ? "Plus de port RIST libre."
            : `Refusé par le relais : ${e.code}`
    : "Le relais ne répond pas.";

/** Formule effective du compte, pour la limite transmise au Core (qui recompte). */
async function limitOf(userId: string) {
  const { data } = await createAdminClient().from("profiles").select("plan, plan_until").eq("id", userId).maybeSingle();
  return relayLimit(effectivePlan(data));
}

export async function adminCreateRelayAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const p = z
    .object({ userId: uid, name: z.string().trim().min(1, "Donne un nom au relais.").max(40, "40 caractères au plus."), protocol: z.enum(["srtla", "rtmp", "rist"]), server: z.string() })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Formulaire invalide." };
  if (!serverById(p.data.server)?.available) return { error: "Ce serveur n'est pas disponible." };
  if (!hasCore) return { error: "Core non configuré." };
  try {
    const relay = await createRelay(p.data.userId, { name: p.data.name, protocol: p.data.protocol, server: p.data.server, limit: await limitOf(p.data.userId) });
    await audit(admin.email!, "relay.create", p.data.userId, null, { relay: relay.id, name: p.data.name, protocol: p.data.protocol });
  } catch (e) {
    if (!(e instanceof CoreRefusal || e instanceof CoreOutdated)) console.error("adminCreateRelay", e);
    return { error: relayRefusal(e) };
  }
  revalidatePath("/admin/relais");
  done(p.data.userId);
  return { ok: "Relais créé." };
}

const RELAY_OPS = ["rename", "archive", "restore", "record_on", "record_off", "rotate", "delete"] as const;

export async function adminRelayAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const p = z.object({ userId: uid, relayId: uid, op: z.enum(RELAY_OPS), name: z.string().trim().max(40).optional() }).safeParse(Object.fromEntries(form));
  if (!p.success) return { error: "Requête invalide." };
  const { userId, relayId, op } = p.data;
  if (!hasCore) return { error: "Core non configuré." };
  let ok = "Enregistré.";
  try {
    if (op === "rename") {
      if (!p.data.name) return { error: "Donne un nom au relais." };
      await updateRelay(userId, relayId, { name: p.data.name });
      ok = "Relais renommé.";
    } else if (op === "archive") {
      await updateRelay(userId, relayId, { archived: true });
      ok = "Relais archivé : ses URLs sont coupées.";
    } else if (op === "restore") {
      await updateRelay(userId, relayId, { archived: false, limit: await limitOf(userId) });
      ok = "Relais réactivé.";
    } else if (op === "record_on" || op === "record_off") {
      await updateRelay(userId, relayId, { record: op === "record_on" });
      ok = op === "record_on" ? "Enregistrement activé." : "Enregistrement arrêté.";
    } else if (op === "rotate") {
      await rotateRelay(userId, relayId);
      ok = "Nouvelle clé générée : l'ancienne est coupée.";
    } else {
      await deleteRelay(userId, relayId);
      ok = "Relais supprimé.";
    }
  } catch (e) {
    if (!(e instanceof CoreRefusal || e instanceof CoreOutdated)) console.error("adminRelayAction", e);
    return { error: relayRefusal(e) };
  }
  await audit(admin.email!, `relay.${op}`, userId, null, { relay: relayId, ...(p.data.name ? { name: p.data.name } : {}) });
  revalidatePath("/admin/relais");
  done(userId);
  return { ok };
}

/** Envoie au client un lien pour choisir un nouveau mot de passe (valable 1 h). Le lien part par e-mail, l'admin ne voit jamais le mot de passe. */
export async function sendResetLinkAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const db = createAdminClient();
  const { data: u } = await db.auth.admin.getUserById(userId.data);
  const email = u.user?.email;
  if (!email) return { error: "Compte introuvable." };
  const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.error("sendResetLinkAction", error?.message);
    return { error: "Impossible de créer le lien." };
  }
  const url = `${site.url}/auth/confirm?token_hash=${encodeURIComponent(hashed)}&type=recovery&next=${encodeURIComponent("/reinitialiser")}`;
  const sent = await sendEmailResult(email, resetPassword({ url }));
  await audit(admin.email!, "account.reset_link", userId.data, null, null);
  return sent.ok ? { ok: `Lien envoyé à ${email}. Il est valable 1 h.` } : { error: `E-mail non envoyé : ${sent.reason}` };
}

/** Définit un nouveau mot de passe pour le client, puis le prévient par e-mail (sans lui envoyer le mot de passe). */
export async function setPasswordAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const pw = String(form.get("password") ?? "");
  if (pw !== String(form.get("password_confirm") ?? "")) return { error: "Les deux mots de passe ne correspondent pas." };
  const problem = passwordProblem(pw);
  if (problem) return { error: problem };
  const db = createAdminClient();
  const { data: u } = await db.auth.admin.getUserById(userId.data);
  const email = u.user?.email;
  if (!email) return { error: "Compte introuvable." };
  const { error } = await db.auth.admin.updateUserById(userId.data, { password: pw });
  if (error) {
    console.error("setPasswordAction", error.message);
    return { error: "Impossible de changer le mot de passe." };
  }
  await audit(admin.email!, "account.set_password", userId.data, null, null);
  const sent = await sendEmailResult(email, passwordChanged({ at: new Date() }));
  return { ok: sent.ok ? `Mot de passe changé. ${email} est prévenu par e-mail. Communique-lui le nouveau mot de passe par un canal sûr.` : "Mot de passe changé, mais l'e-mail de prévenance n'est pas parti." };
}

/** Écrit au client depuis la fiche compte : crée une conversation dans son espace Assistance, une notification dans sa cloche, puis le prévient par e-mail. */
export async function sendMessageAction(_prev: PlanState, form: FormData): Promise<PlanState> {
  const admin = await requireAdmin("accounts");
  const userId = uid.safeParse(form.get("userId"));
  if (!userId.success) return { error: "Requête invalide." };
  const subject = String(form.get("subject") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (subject.length < 3 || subject.length > 120) return { error: "Objet : 3 à 120 caractères." };
  if (body.length < 5 || body.length > 4000) return { error: "Message : 5 à 4000 caractères." };
  const db = createAdminClient();
  const [{ data: u }, { data: p }] = await Promise.all([db.auth.admin.getUserById(userId.data), db.from("profiles").select("first_name").eq("id", userId.data).maybeSingle()]);
  const email = u.user?.email;
  if (!email) return { error: "Compte introuvable." };
  const now = new Date().toISOString();
  // La conversation vit dans le système d'assistance : le client la voit dans « Assistance », l'équipe dans « Support ».
  const ins = await db.from("support_tickets").insert({ user_id: userId.data, subject, category: "autre", status: "open", last_from: "staff", first_reply_at: now }).select("id").single();
  if (ins.error || !ins.data) {
    console.error("sendMessageAction : ticket", ins.error?.message);
    return { error: "Impossible de créer la conversation." };
  }
  const ticketId = ins.data.id as string;
  const first = String(admin.email ?? "").split("@")[0];
  const err = await addMessage({ ticket_id: ticketId, author_id: admin.id, from_staff: true, body, signature: `${first || "L'équipe"} - Équipe SYXTEE` });
  if (err) {
    console.error("sendMessageAction : message", err.message);
    return { error: "Impossible d'enregistrer le message." };
  }
  await db.from("support_tickets").update({ assigned_to: admin.id, assigned_at: now }).eq("id", ticketId);
  await db.from("notifications").insert({ user_id: userId.data, title: "Nouveau message de l'équipe", body: subject });
  await audit(admin.email!, "account.message", userId.data, null, { ticket: ticketId, subject });
  const sent = await sendEmailResult(email, staffMessage({ firstName: p?.first_name ?? null, subject, from: first || "L'équipe SYXTEE", url: `${site.url}/dashboard/support/${ticketId}` }));
  revalidatePath("/admin/support");
  return sent.ok ? { ok: `Message envoyé dans l'espace Assistance de ${email}. Un e-mail le prévient.` } : { ok: "Message envoyé dans son espace Assistance. L'e-mail de prévenance n'est pas parti." };
}
