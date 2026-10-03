"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { allow } from "@/lib/auth/rateLimit";
import { CoreOutdated, CoreRefusal, createRelay, deleteRelay, rotateRelay, updateRelay, type RelayView } from "@/lib/core";
import { forgetOverview } from "@/lib/dashboard-overview";
import { getPlan, LOCKED_MESSAGE } from "@/lib/auth/plan";
import { can, relayLimit, type Feature } from "@/lib/plans";
import { serverById } from "@/lib/relay-servers";

// Actions « Mes relais ». Droits et quotas de plans.ts, vérifiés ici ; le Core recompte avant de créer ou réactiver.
// Compte gratuit : seules la suppression et l'archivage restent possibles (relais d'une ancienne formule).

export type RelayActionState = { error?: string; relay?: RelayView };

const DOWN = "Le relais ne répond pas. Réessaie dans un instant.";
const OUTDATED = "Le serveur relais n'est pas encore à jour. Réessaie après sa mise à jour.";
const refusal = (e: unknown) =>
  e instanceof CoreOutdated
    ? OUTDATED
    : e instanceof CoreRefusal
    ? e.code === "quota"
      ? "Limite de relais atteinte pour ta formule."
      : e.code === "regie_disabled"
        ? "La régie n'est pas encore disponible."
        : e.code === "rtmp_disabled"
          ? "L'entrée RTMP n'est pas encore ouverte sur ce serveur."
          : e.code === "rist_disabled"
            ? "L'entrée RIST n'est pas encore ouverte sur ce serveur."
            : e.code === "rist_ports_full"
              ? "Plus de port RIST libre sur ce serveur. Choisis SRTLA ou RTMP."
              : "Ce serveur n'accepte pas de nouveaux relais pour le moment."
    : DOWN;

function done(userId: string, relayId?: string) {
  forgetOverview(userId);
  revalidatePath("/dashboard/relais");
  if (relayId) revalidatePath(`/dashboard/relais/${relayId}`);
}

const createInput = z.object({
  name: z.string().trim().min(1, "Donne un nom à l'appareil.").max(40, "40 caractères au plus."),
  protocol: z.enum(["srtla", "rtmp", "rist"]),
  server: z.string(),
});

export async function createRelayAction(input: z.input<typeof createInput>): Promise<RelayActionState> {
  const user = await requireUser("/dashboard/relais");
  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Champs invalides." };
  const { name, protocol, server } = parsed.data;
  if (!serverById(server)?.available) return { error: "Ce serveur n'est pas encore disponible." };
  const plan = await getPlan();
  if (!can(plan, "relais") || plan.maxRelays <= 0) return { error: LOCKED_MESSAGE };
  if (!(await allow(`relay-create:${user.id}`, 10, 3600))) return { error: "Trop de créations. Réessaie dans une heure." };
  try {
    const relay = await createRelay(user.id, { name, protocol, server, limit: relayLimit(plan) });
    done(user.id);
    return { relay };
  } catch (e) {
    if (!(e instanceof CoreRefusal || e instanceof CoreOutdated)) console.error("createRelay", e);
    return { error: refusal(e) };
  }
}

const id = z.uuid();

async function run(relayId: string, key: string, max: number, job: (userId: string) => Promise<unknown>, feature: Feature | null = "relais"): Promise<RelayActionState> {
  const user = await requireUser("/dashboard/relais");
  if (!id.safeParse(relayId).success) return { error: "Relais introuvable." };
  if (feature && !can(await getPlan(), feature)) return { error: LOCKED_MESSAGE };
  if (!(await allow(`${key}:${user.id}`, max, 3600))) return { error: "Trop de changements. Réessaie dans une heure." };
  try {
    await job(user.id);
  } catch (e) {
    if (!(e instanceof CoreRefusal)) console.error(key, e);
    return { error: refusal(e) };
  }
  done(user.id, relayId);
  return {};
}

export async function renameRelayAction(relayId: string, name: string) {
  const n = name.trim();
  if (n.length < 1 || n.length > 40) return { error: "Entre 1 et 40 caractères." };
  return run(relayId, "relay-edit", 60, (u) => updateRelay(u, relayId, { name: n }));
}

/** Nouvelle clé : l'ancienne cesse de marcher immédiatement (encodeur et OBS doivent recoller les URLs). */
export async function rotateRelayAction(relayId: string) {
  return run(relayId, "rotate", 10, (u) => rotateRelay(u, relayId));
}

/** Archiver coupe les URLs du relais ; le réactiver compte de nouveau dans la limite de la formule. */
export async function archiveRelayAction(relayId: string, archived: boolean) {
  const limit = relayLimit(await getPlan());
  // Archiver reste possible sans formule ; réactiver demande la fonction « relais » (et le Core recompte).
  return run(relayId, "relay-edit", 60, (u) => updateRelay(u, relayId, { archived, limit }), archived ? null : "relais");
}

export async function deleteRelayAction(relayId: string) {
  return run(relayId, "relay-delete", 20, (u) => deleteRelay(u, relayId), null);
}

/** Mode de sortie d'un relais : Direct (OBS lit l'encodeur) ou Régie (mire automatique si l'encodeur coupe). */
export async function changeModeAction(relayId: string, mode: "direct" | "regie") {
  const r = await run(relayId, "mode", 20, (u) => updateRelay(u, relayId, { mode }), "mire");
  revalidatePath("/dashboard/mire");
  return r;
}
