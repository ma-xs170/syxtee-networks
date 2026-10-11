import type { ChildProcess } from "node:child_process";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { defaultBackend, RESOLUTIONS, type Backend, type Resolution } from "./hardware.ts";
import { listLinks, type Link } from "./links.ts";
import { Pipeline, parseTarget, type PipelineState } from "./pipeline.ts";
import { hasSrtlaSend, startSrtlaSend } from "./srtla.ts";

export type Settings = { url: string; res: Resolution; bitrateKbps: number; latencyMs: number; backend: Backend; device?: string; disabledLinks: string[] };
export type LinkState = Link & { enabled: boolean; kbps: number | null };
export type EventLog = { at: number; level: "info" | "warn" | "bad"; text: string };

/** Débit émis par une interface (Linux : compteur du noyau). Absent sur Mac. */
function txBytes(name: string): number | null {
  try { return Number(readFileSync(`/sys/class/net/${name}/statistics/tx_bytes`, "utf8")); } catch { return null; }
}

/** Remplace la clé de diffusion de l'URL par des points : elle ne quitte jamais le boîtier vers l'écran. */
export function maskUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.searchParams.has("streamid")) u.searchParams.set("streamid", "••••••••");
    return decodeURIComponent(u.toString());
  } catch { return raw; }
}

const DEFAULTS: Settings = { url: "", res: "1080p30", bitrateKbps: 4000, latencyMs: 1000, backend: defaultBackend(), disabledLinks: [] };

/** État et actions du boîtier : une seule source pour l'interface locale, la ligne de commande et plus tard le canal du Core. */
export class Controller {
  settings: Settings;
  events: EventLog[] = [];
  since: number | null = null;
  state: PipelineState = "idle";
  private pipeline: Pipeline | null = null;
  private srtla: ChildProcess | null = null;
  private rates = new Map<string, { bytes: number; at: number; kbps: number | null }>();
  private timer: NodeJS.Timeout;
  private file: string | null;
  private pipelineBin?: string;

  constructor(opts: { dataDir?: string | null; pipelineBin?: string; overrides?: Partial<Settings> } = {}) {
    const dir = opts.dataDir === undefined ? join(homedir(), ".syxtee-encoder") : opts.dataDir;
    this.file = dir ? join(dir, "settings.json") : null;
    this.pipelineBin = opts.pipelineBin;
    let saved: Partial<Settings> = {};
    if (this.file) {
      try { saved = JSON.parse(readFileSync(this.file, "utf8")); } catch { /* premier démarrage */ }
    }
    this.settings = { ...DEFAULTS, ...saved, ...opts.overrides };
    this.timer = setInterval(() => this.pollRates(), 1000);
    this.timer.unref();
  }

  private log(level: EventLog["level"], text: string): void {
    this.events.push({ at: Date.now(), level, text });
    if (this.events.length > 50) this.events.shift();
  }

  private save(): void {
    if (!this.file) return;
    const dir = join(this.file, "..");
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.file, JSON.stringify(this.settings, null, 2), { mode: 0o600 });
    chmodSync(this.file, 0o600); // contient la clé de diffusion
  }

  private pollRates(): void {
    const now = Date.now();
    for (const l of listLinks()) {
      const bytes = txBytes(l.name);
      const prev = this.rates.get(l.name);
      if (bytes === null) { this.rates.set(l.name, { bytes: 0, at: now, kbps: null }); continue; }
      const kbps = prev && prev.kbps !== undefined && bytes >= prev.bytes ? Math.round(((bytes - prev.bytes) * 8) / ((now - prev.at) / 1000) / 1000) : null;
      this.rates.set(l.name, { bytes, at: now, kbps });
    }
  }

  links(): LinkState[] {
    return listLinks().map((l) => ({ ...l, enabled: !this.settings.disabledLinks.includes(l.name), kbps: this.rates.get(l.name)?.kbps ?? null }));
  }

  snapshot() {
    const links = this.links();
    const bonding = !this.settings.url ? "none" : this.settings.url.startsWith("srtla:") ? "srtla" : "srt";
    return {
      state: this.state,
      since: this.since,
      settings: { ...this.settings, url: maskUrl(this.settings.url), hasUrl: !!this.settings.url },
      links,
      bonding,
      srtlaAvailable: hasSrtlaSend(),
      resolutions: Object.keys(RESOLUTIONS),
      events: this.events.slice(-30),
      now: Date.now(),
    };
  }

  /** Valide et enregistre des réglages. Renvoie un message d'erreur lisible, ou null si tout est bon. */
  update(patch: Record<string, unknown>): string | null {
    const next = { ...this.settings };
    if (patch.url !== undefined) {
      const url = String(patch.url).trim();
      if (url) {
        try { parseTarget(url); } catch (e) { return (e as Error).message; }
      }
      // Le champ affiche la clé masquée : renvoyé tel quel, il ne doit pas écraser la vraie clé.
      if (url !== maskUrl(this.settings.url) || !this.settings.url) next.url = url;
    }
    if (patch.res !== undefined) {
      if (!(String(patch.res) in RESOLUTIONS)) return "Résolution inconnue.";
      next.res = patch.res as Resolution;
    }
    if (patch.bitrateKbps !== undefined) {
      const n = Number(patch.bitrateKbps);
      if (!Number.isFinite(n) || n < 500 || n > 15000) return "Le débit doit être entre 500 et 15000 kb/s.";
      next.bitrateKbps = Math.round(n);
    }
    if (patch.latencyMs !== undefined) {
      const n = Number(patch.latencyMs);
      if (!Number.isFinite(n) || n < 100 || n > 8000) return "La latence doit être entre 100 et 8000 ms.";
      next.latencyMs = Math.round(n);
    }
    this.settings = next;
    this.save();
    this.log("info", this.state === "idle" ? "Réglages enregistrés." : "Réglages enregistrés, appliqués au prochain démarrage.");
    return null;
  }

  setLinkEnabled(name: string, enabled: boolean): string | null {
    if (!listLinks().some((l) => l.name === name)) return "Lien inconnu.";
    const off = new Set(this.settings.disabledLinks);
    if (enabled) off.delete(name); else off.add(name);
    this.settings.disabledLinks = [...off];
    this.save();
    this.log("info", `Lien ${name} ${enabled ? "activé" : "désactivé"}.`);
    if (this.srtla) this.restartSrtla();
    return null;
  }

  private activeLinks(): Link[] {
    return listLinks().filter((l) => !this.settings.disabledLinks.includes(l.name));
  }

  private restartSrtla(): void {
    this.srtla?.kill();
    this.srtla = null;
    const target = parseTarget(this.settings.url, this.settings.latencyMs);
    if (target.kind !== "srtla") return;
    try { this.srtla = startSrtlaSend(target, this.activeLinks()); } catch (e) { this.log("bad", (e as Error).message); }
  }

  start(): string | null {
    if (this.pipeline) return "Le direct est déjà lancé.";
    if (!this.settings.url) return "Ajoute une destination dans les réglages.";
    let target;
    try { target = parseTarget(this.settings.url, this.settings.latencyMs); } catch (e) { return (e as Error).message; }
    if (target.kind === "srtla") {
      if (!hasSrtlaSend()) return "srtla_send est introuvable : utilise une URL srt:// ou installe-le.";
      if (this.activeLinks().length === 0) return "Aucun lien réseau actif.";
      try { this.srtla = startSrtlaSend(target, this.activeLinks()); } catch (e) { return (e as Error).message; }
    }
    const p = new Pipeline({ backend: this.settings.backend, res: this.settings.res, bitrateKbps: this.settings.bitrateKbps, device: this.settings.device }, target, this.pipelineBin);
    p.on("state", (s: PipelineState, detail?: string) => {
      this.state = s;
      if (s === "live") { this.since = Date.now(); this.log("info", "Le direct est en ligne."); }
      if (s === "error") { this.since = null; this.log("bad", detail ?? "Erreur du flux, nouvelle tentative."); }
      if (s === "starting") this.log("info", "Connexion au serveur.");
    });
    this.pipeline = p;
    p.start();
    return null;
  }

  async stop(): Promise<void> {
    const p = this.pipeline;
    this.pipeline = null;
    await p?.stop();
    this.srtla?.kill();
    this.srtla = null;
    this.state = "idle";
    this.since = null;
    if (p) this.log("info", "Direct arrêté.");
  }
}
