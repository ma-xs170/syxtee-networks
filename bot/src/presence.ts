import { ActivityType, type Client } from "discord.js";
import { coreAdmin } from "./checks.ts";
import type { Config } from "./config.ts";
import type { PresenceType, State } from "./state.ts";

// Statut du bot : « Regarde le stream de <nom> » quand un direct est en cours (rotation s'il y en a plusieurs),
// sinon « syxtee-networks · /services ». Seuls les comptes qui ont coché « Afficher sur le site » sont nommés.
// Le panel du site peut imposer un texte fixe (mode « custom »).

const POLL_MS = 20_000;
const ROTATE_MS = 30_000;
const IDLE = "syxtee-networks · /services";
const TYPES: Record<PresenceType, ActivityType> = {
  watching: ActivityType.Watching,
  playing: ActivityType.Playing,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
};

type Live = { live: { user_id: string }[] };
type Profile = { id: string; username: string | null; twitch_display_name: string | null; show_on_site: boolean };

async function names(cfg: Config, ids: string[]): Promise<string[]> {
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SECRET_KEY || ids.length === 0) return [];
  try {
    const url = `${cfg.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/profiles?id=in.(${ids.join(",")})&select=id,username,twitch_display_name,show_on_site`;
    const res = await fetch(url, { headers: { apikey: cfg.SUPABASE_SECRET_KEY, Authorization: `Bearer ${cfg.SUPABASE_SECRET_KEY}` }, signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const rows = (await res.json()) as Profile[];
    return rows.filter((p) => p.show_on_site).map((p) => p.twitch_display_name || p.username || "").filter(Boolean);
  } catch {
    return [];
  }
}

export function presenceText(nameList: string[], index: number) {
  if (nameList.length === 0) return IDLE;
  return `le stream de ${nameList[index % nameList.length]}`;
}

export function startPresence(client: Client, cfg: Config, state: State) {
  let list: string[] = [];
  let index = 0;
  let last = "";
  let current = IDLE;

  const apply = () => {
    const p = state.settings.presence;
    const custom = p.mode === "custom" && p.text.trim() !== "";
    const type: PresenceType = custom ? p.type : "watching";
    current = custom ? p.text.trim() : presenceText(list, index);
    const key = `${type}:${current}`;
    if (key === last) return;
    last = key;
    client.user?.setPresence({ activities: [{ name: current, type: TYPES[type] }], status: "online" });
  };

  const poll = async () => {
    const l = await coreAdmin<Live>(cfg, "/v1/admin/live");
    list = l ? [...new Set(await names(cfg, [...new Set(l.live.map((r) => r.user_id))]))] : [];
    apply();
  };

  void poll();
  const a = setInterval(() => void poll(), POLL_MS);
  const b = setInterval(() => {
    index++;
    apply();
  }, ROTATE_MS);
  return { refresh: apply, current: () => current, stop: () => (clearInterval(a), clearInterval(b)) };
}
