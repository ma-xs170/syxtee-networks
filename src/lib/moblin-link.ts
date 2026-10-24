export type ObsAccess = { url: string; password: string };

/** Lien d'import Moblin : le stream et, si l'adresse WebSocket d'OBS est donnée, le contrôle d'OBS dans le même scan. */
export function moblinLink(name: string, url: string, obs?: ObsAccess) {
  const wsUrl = obs?.url.trim();
  const stream = { name, url, ...(wsUrl ? { obs: { webSocketUrl: wsUrl, webSocketPassword: obs?.password ?? "" } } : {}) };
  return `moblin://?${encodeURIComponent(JSON.stringify({ streams: [stream] }))}`;
}
