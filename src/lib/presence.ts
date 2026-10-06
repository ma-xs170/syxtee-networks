// Présence d'un compte : « En ligne » si le dashboard a battu il y a moins de 2 minutes, sinon la dernière activité.
export const ONLINE_MS = 2 * 60_000;

export function presenceOf(lastSeen: string | null | undefined, lastSignIn?: string | null): { online: boolean; label: string; at: string | null } {
  const at = lastSeen ?? lastSignIn ?? null;
  if (!at) return { online: false, label: "Jamais connecté", at: null };
  const diff = Date.now() - Date.parse(at);
  if (lastSeen && diff < ONLINE_MS) return { online: true, label: "En ligne", at };
  const min = Math.round(diff / 60_000);
  const label = min < 60 ? `Vu il y a ${Math.max(1, min)} min` : min < 1440 ? `Vu il y a ${Math.round(min / 60)} h` : `Vu le ${new Date(at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`;
  return { online: false, label, at };
}
