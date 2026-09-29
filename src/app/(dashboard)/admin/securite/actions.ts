"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { banIp, CoreRefusal, unbanIp } from "@/lib/core";

// Actions de la page admin « Sécurité » : bannir ou débannir une IP (SRT, SRTLA, RTMP, Cam).

export type BanState = { error?: string; ok?: string };

const banInput = z.object({
  ip: z.union([z.ipv4(), z.ipv6()], { message: "Adresse IP invalide." }),
  minutes: z.coerce.number().int().min(1).max(525_600),
  reason: z.string().trim().min(1, "Indique une raison.").max(200),
});

export async function banAction(_prev: BanState, form: FormData): Promise<BanState> {
  await requireAdmin();
  const parsed = banInput.safeParse({ ip: form.get("ip"), minutes: form.get("minutes"), reason: form.get("reason") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  try {
    await banIp(parsed.data.ip, parsed.data.minutes, parsed.data.reason);
  } catch (e) {
    return { error: e instanceof CoreRefusal ? `Refusé : ${e.code}` : "Le relais ne répond pas." };
  }
  revalidatePath("/admin/securite");
  return { ok: `${parsed.data.ip} bannie.` };
}

export async function unbanAction(form: FormData) {
  await requireAdmin();
  const ip = z.union([z.ipv4(), z.ipv6()]).safeParse(form.get("ip"));
  if (!ip.success) return;
  await unbanIp(ip.data).catch(() => {});
  revalidatePath("/admin/securite");
}
