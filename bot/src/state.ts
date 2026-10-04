import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Réglages modifiables depuis le panel du site (statut du bot, alertes) et journal des derniers messages publiés.
// Réglages gardés dans DATA_DIR/settings.json (volume Docker) ; sans volume, ils tiennent jusqu'au prochain redémarrage.

export type PresenceType = "watching" | "playing" | "listening" | "competing";
export type Settings = {
  alertsEnabled: boolean;
  presence: { mode: "auto" | "custom"; type: PresenceType; text: string };
};
export type LogEntry = { at: string; kind: "nouveauté" | "annonce" | "alerte" | "services"; title: string; by: string };

const DEFAULTS: Settings = { alertsEnabled: true, presence: { mode: "auto", type: "watching", text: "" } };

export function createState(dataDir: string, alertsDefault: boolean) {
  const file = join(dataDir, "settings.json");
  let settings: Settings = { ...DEFAULTS, alertsEnabled: alertsDefault };
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<Settings>;
    settings = { alertsEnabled: raw.alertsEnabled ?? settings.alertsEnabled, presence: { ...DEFAULTS.presence, ...raw.presence } };
  } catch {
    // premier démarrage ou pas de volume
  }
  const log: LogEntry[] = [];

  const save = () => {
    try {
      mkdirSync(dataDir, { recursive: true });
      writeFileSync(file, JSON.stringify(settings, null, 2));
    } catch (err) {
      console.warn("réglages non enregistrés (pas de volume ?) :", (err as Error).message);
    }
  };

  return {
    get settings() {
      return settings;
    },
    update(patch: Partial<Settings>) {
      settings = { ...settings, ...patch, presence: { ...settings.presence, ...patch.presence } };
      save();
    },
    log,
    record(entry: Omit<LogEntry, "at">) {
      log.unshift({ at: new Date().toISOString(), ...entry });
      log.length = Math.min(log.length, 20);
    },
  };
}

export type State = ReturnType<typeof createState>;
