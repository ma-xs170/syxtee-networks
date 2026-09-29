// Lecture du journal du srt-live-server (OpenIRL), la seule source qui donne l'IP et le port de chaque connexion SRT.
// Le SLS vérifie lui-même chaque streamid dans sa base (paires déclarées par le Core) ; ce journal sert à :
// compter les refus (force brute), alerter le propriétaire (2e appareil sur sa clé) et couper une session (IP:port).
// Lignes utiles (préfixe « | <date> SLS <niveau>: » retiré) :
//   [0xL]CSLSListener::validate_stream_id, invalid publisher stream ID='X'
//   [0xL]CSLSListener::handler, [::ffff:IP:PORT], invalid stream ID='X'.
//   [0xL]CSLSListener::handler, refused, new role[::ffff:IP:PORT], stream='KEY',but publisher=0x… is not NULL.
//   [0xL]CSLSListener::handler, new publisher[::ffff:IP:PORT], key_stream_name=KEY.
//   [0xM]CSLSMapPublisher::set_push_2_pushlisher, ok, publisher=0xP, app_streamname=KEY, …
//   [0xL]CSLSListener::handler, new player[0xP]=[::ffff:IP:PORT], key_stream_name=KEY, publisher=0x…
//   [0xP]CSLSRole::invalid_srt, close sock=…
// Via SRTLA, l'IP vue par le SLS est celle de srtla_rec (127.0.0.1) : l'IP réelle du téléphone n'y figure pas.

export type Role = "publisher" | "player";
export type SlsEvent =
  | { kind: "refused"; ip: string; port: number; role: Role | null; key: string }
  | { kind: "duplicate"; ip: string; port: number; key: string }
  | { kind: "publisher"; ip: string; port: number; key: string }
  | { kind: "publisher_ptr"; key: string; ptr: string }
  | { kind: "player"; ip: string; port: number; key: string; ptr: string }
  | { kind: "closed"; ptr: string };

/** « [::ffff:1.2.3.4:5000] » ou « [2001:db8::1:5000] » → IP sans préfixe IPv4-mappé + port. */
export function parseAddr(s: string): { ip: string; port: number } | null {
  const m = /^\[?([^\]]+):(\d+)\]?$/.exec(s.trim());
  if (!m) return null;
  return { ip: m[1].replace(/^::ffff:/i, ""), port: Number(m[2]) };
}

const PTR = /\[(0x[0-9a-f]+)\]/;
const ADDR = String.raw`\[([^\]]+:\d+)\]`;
const RE = {
  validate: /CSLSListener::validate_stream_id, invalid (publisher|player) stream ID='([^']*)'/,
  invalid: new RegExp(`CSLSListener::handler, ${ADDR}, invalid stream ID='([^']*)'`),
  duplicate: new RegExp(`CSLSListener::handler, refused, new role${ADDR}, stream='([^']*)'`),
  publisher: new RegExp(`CSLSListener::handler, new publisher${ADDR}, key_stream_name=([^,\\s]+?)\\.?$`),
  publisherPtr: /CSLSMapPublisher::set_push_2_pushlisher, ok, publisher=(0x[0-9a-f]+), app_streamname=([^,\s]+)/,
  player: new RegExp(`CSLSListener::handler, new player\\[(0x[0-9a-f]+)\\]=${ADDR}, key_stream_name=([^,\\s]+)`),
  closed: /CSLSRole::invalid_srt, close sock=/,
};

export function createSlsLogParser() {
  const roleOf = new Map<string, Role>(); // pointeur du listener → rôle de la dernière clé refusée
  const recent: string[] = []; // le SLS écrit chaque ligne deux fois : on ignore les répétitions
  const seen = new Set<string>();

  return function parse(raw: string): SlsEvent | null {
    const line = raw.trim();
    if (!line.includes("SLS")) return null;
    if (seen.has(line)) return null;
    seen.add(line);
    recent.push(line);
    if (recent.length > 500) seen.delete(recent.shift()!);

    const ptr = PTR.exec(line)?.[1] ?? "";
    let m: RegExpExecArray | null;
    if ((m = RE.validate.exec(line))) {
      roleOf.set(ptr, m[1] as Role);
      return null;
    }
    if ((m = RE.invalid.exec(line))) {
      const a = parseAddr(m[1]);
      if (!a) return null;
      const role = roleOf.get(ptr) ?? null;
      roleOf.delete(ptr);
      return { kind: "refused", ...a, role, key: m[2] };
    }
    if ((m = RE.duplicate.exec(line))) {
      const a = parseAddr(m[1]);
      return a ? { kind: "duplicate", ...a, key: m[2] } : null;
    }
    if ((m = RE.publisher.exec(line))) {
      const a = parseAddr(m[1]);
      return a ? { kind: "publisher", ...a, key: m[2] } : null;
    }
    if ((m = RE.publisherPtr.exec(line))) return { kind: "publisher_ptr", ptr: m[1], key: m[2] };
    if ((m = RE.player.exec(line))) {
      const a = parseAddr(m[2]);
      return a ? { kind: "player", ...a, key: m[3], ptr: m[1] } : null;
    }
    if (RE.closed.test(line) && ptr) return { kind: "closed", ptr };
    return null;
  };
}
