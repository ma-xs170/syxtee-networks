import type { Config } from "./config.ts";
import { type Check, coreAdmin, runChecks, STATUS_ICON, STATUS_LABEL } from "./checks.ts";
import { bar, baseEmbed, duration, title } from "./theme.ts";

// Construction des embeds : chaque fonction renvoie un embed prêt à envoyer.

export async function servicesEmbed(cfg: Config) {
  const checks = await runChecks(cfg);
  return { embed: servicesFromChecks(checks), checks };
}

export function servicesFromChecks(checks: Check[]) {
  const down = checks.filter((c) => c.status === "down").length;
  const slow = checks.filter((c) => c.status === "slow").length;
  const summary =
    down > 0 ? `🔴 **${down} service${down > 1 ? "s" : ""} hors ligne**` : slow > 0 ? `🟠 **Lenteurs détectées**` : "🟢 **Tous les systèmes fonctionnent**";
  const lines = checks.map((c) => {
    const ms = c.ms !== null ? ` · \`${c.ms} ms\`` : "";
    const detail = c.detail ? ` · ${c.detail}` : "";
    return `${STATUS_ICON[c.status]} **${c.name}**\n┗ ${STATUS_LABEL[c.status]}${ms}${detail}`;
  });
  const unix = Math.floor(Date.now() / 1000);
  return baseEmbed({ banner: true })
    .setTitle("État des services")
    .setDescription(`${summary}\n\n${lines.join("\n\n")}\n\n${title("Actualisation")} <t:${unix}:R>`);
}

type Stats = {
  cpu: { percent: number; load1: number; cores: number };
  memory: { totalMb: number; usedMb: number };
  network: { rxMbps: number; txMbps: number; available: boolean };
  uptimeS: number;
  streams_live: number;
  sls: boolean;
};

export async function serverEmbed(cfg: Config) {
  const s = await coreAdmin<Stats>(cfg, "/v1/admin/stats");
  const e = baseEmbed({ banner: true }).setTitle("Serveur");
  if (!s) return e.setDescription("Données indisponibles : le Core ne répond pas ou `CORE_API_TOKEN` manque dans la config du bot.");
  const mem = Math.round((s.memory.usedMb / s.memory.totalMb) * 100);
  return e
    .setDescription(`${title("VPS · Beauharnois")}`)
    .addFields(
      { name: "Processeur", value: `\`${bar(s.cpu.percent)}\` **${s.cpu.percent} %**\n${s.cpu.cores} cœurs · charge ${s.cpu.load1.toFixed(2)}`, inline: true },
      { name: "Mémoire", value: `\`${bar(mem)}\` **${mem} %**\n${(s.memory.usedMb / 1024).toFixed(1)} / ${(s.memory.totalMb / 1024).toFixed(1)} Go`, inline: true },
      { name: "Réseau", value: s.network.available ? `⬇ **${s.network.rxMbps}** Mb/s\n⬆ **${s.network.txMbps}** Mb/s` : "Indisponible", inline: true },
      { name: "En direct", value: `**${s.streams_live}** flux`, inline: true },
      { name: "Relais", value: s.sls ? "🟢 En ligne" : "🔴 Hors ligne", inline: true },
      { name: "Disponibilité", value: duration(s.uptimeS), inline: true },
    );
}

type Live = { live: { relay_id: string; since: string | null; bitrate: number | null; links: number | null }[] };

export async function liveEmbed(cfg: Config) {
  const l = await coreAdmin<Live>(cfg, "/v1/admin/live");
  const e = baseEmbed({ banner: true }).setTitle("Directs");
  if (!l) return e.setDescription("Données indisponibles : le Core ne répond pas ou `CORE_API_TOKEN` manque dans la config du bot.");
  if (l.live.length === 0) return e.setDescription("Aucun direct pour le moment.\n\nRetrouve la plateforme sur le site pour lancer le tien.");
  const lines = l.live.map((r, i) => {
    const since = r.since ? ` · depuis <t:${Math.floor(new Date(r.since).getTime() / 1000)}:R>` : "";
    const rate = r.bitrate ? ` · \`${(r.bitrate / 1000).toFixed(1)} Mb/s\`` : "";
    const links = r.links ? ` · ${r.links} lien${r.links > 1 ? "s" : ""}` : "";
    return `🔴 **Direct ${i + 1}**${since}${rate}${links}`;
  });
  return e.setDescription(`**${l.live.length}** flux en direct\n\n${lines.join("\n")}`);
}

export function linksEmbed(cfg: Config) {
  const s = cfg.SITE_URL.replace(/\/$/, "");
  return baseEmbed({ banner: true })
    .setTitle("Liens SYXTEE")
    .setDescription(
      [
        `${title("Plateforme")}`,
        `[Site web](${s}) · [Connexion](${s}/connexion) · [Dashboard](${s}/dashboard)`,
        "",
        `${title("Outils")}`,
        `[Relais](${s}) · [Studio](${s}) · [Carte de couverture](${s})`,
      ].join("\n"),
    );
}

export function helpEmbed() {
  return baseEmbed({ banner: true })
    .setTitle("Commandes")
    .setDescription(
      [
        "`/services` · état des services, actualisé en direct",
        "`/live` · les directs en cours",
        "`/serveur` · CPU, mémoire, réseau du VPS",
        "`/ping` · latence du bot",
        "`/liens` · liens utiles",
        "`/annonce` · publier une nouveauté _(gérants du serveur)_",
        "",
        "Les nouveautés du site et les alertes de panne arrivent automatiquement dans le salon dédié.",
      ].join("\n"),
    );
}

export function announceEmbed(opts: { title: string; body: string; url?: string; tag?: string }) {
  const e = baseEmbed({ banner: true }).setTitle(opts.title.slice(0, 256)).setDescription(opts.body.slice(0, 4000));
  if (opts.url) e.setURL(opts.url);
  if (opts.tag) e.setAuthor({ name: `SYXTEE · ${opts.tag.toUpperCase()}`, iconURL: "attachment://logo.png" });
  return e;
}

type Commit = { id: string; message: string; url: string; author?: { name?: string; username?: string } };

/** Nouveautés = commits poussés sur la branche : une ligne par commit, le message de tête seulement. */
export function pushEmbed(commits: Commit[], compareUrl: string) {
  const shown = commits.slice(0, 10);
  const lines = shown.map((c) => {
    const head = c.message.split("\n")[0].slice(0, 160);
    return `▸ ${head} [\`${c.id.slice(0, 7)}\`](${c.url})`;
  });
  const more = commits.length > shown.length ? `\n_… et ${commits.length - shown.length} autre(s)_` : "";
  return baseEmbed({ banner: true })
    .setAuthor({ name: "SYXTEE · NOUVEAUTÉS", iconURL: "attachment://logo.png" })
    .setTitle(commits.length > 1 ? `${commits.length} mises à jour` : "Mise à jour")
    .setURL(compareUrl)
    .setDescription(lines.join("\n") + more);
}

export function alertEmbed(c: Check, previous: string) {
  const down = c.status === "down";
  return baseEmbed()
    .setAuthor({ name: down ? "SYXTEE · ALERTE" : "SYXTEE · RÉTABLI", iconURL: "attachment://logo.png" })
    .setTitle(down ? `${c.name} : hors ligne` : `${c.name} : de retour`)
    .setDescription(
      down
        ? `🔴 Le service **${c.name}** ne répond plus. L'équipe est prévenue.`
        : `🟢 Le service **${c.name}** répond de nouveau${c.ms !== null ? ` (\`${c.ms} ms\`)` : ""}. Précédemment : ${previous}.`,
    );
}
