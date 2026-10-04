import type { Client, TextBasedChannel } from "discord.js";
import { type Check, runChecks, STATUS_LABEL, type Status } from "./checks.ts";
import type { Config } from "./config.ts";
import { alertEmbed } from "./embeds.ts";
import type { State } from "./state.ts";
import { files } from "./theme.ts";

// Surveille les services toutes les 60 s et publie dans le salon une alerte à la panne, une autre au retour.
// Un changement doit être vu 2 fois de suite avant d'alerter (évite les faux positifs d'un seul raté).

const INTERVAL_MS = 60_000;

export function startMonitor(client: Client, cfg: Config, store: State, channel: () => Promise<TextBasedChannel | null>) {
  const stable = new Map<string, Status>();
  const pending = new Map<string, { status: Status; count: number }>();
  let first = true;

  const tick = async () => {
    let checks: Check[];
    try {
      checks = await runChecks(cfg);
    } catch (err) {
      console.error("monitor:", err);
      return;
    }
    for (const c of checks) {
      // « Lent » compte comme en ligne pour les alertes.
      const state: Status = c.status === "slow" ? "up" : c.status;
      const known = stable.get(c.id);
      if (known === undefined) {
        stable.set(c.id, state);
        continue;
      }
      if (state === known) {
        pending.delete(c.id);
        continue;
      }
      const p = pending.get(c.id);
      const count = p && p.status === state ? p.count + 1 : 1;
      pending.set(c.id, { status: state, count });
      if (count < 2) continue;
      pending.delete(c.id);
      stable.set(c.id, state);
      if (!store.settings.alertsEnabled || first) continue;
      const ch = await channel();
      store.record({ kind: "alerte", title: `${c.name} : ${c.status === "down" ? "hors ligne" : "de retour"}`, by: "auto" });
      if (ch && "send" in ch) await ch.send({ embeds: [alertEmbed(c, STATUS_LABEL[known])], files: files() }).catch((e) => console.error("alerte:", e));
    }
    first = false;
  };

  void tick();
  const timer = setInterval(() => void tick(), INTERVAL_MS);
  client.once("destroy" as never, () => clearInterval(timer));
  return () => clearInterval(timer);
}
