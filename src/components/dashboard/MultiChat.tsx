"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { siKick, siTwitch, siYoutube } from "simple-icons";
import { Gear } from "@/components/icons";

// Multichat : Twitch et Kick dans un seul fil (lecture seule, connexion anonyme directement depuis le navigateur),
// YouTube dans un onglet à part (son chat n'est lisible que dans son propre lecteur).
// Les chaînes viennent du profil ; on peut les changer ici (gardé dans ce navigateur).

type Platform = "twitch" | "kick" | "youtube";
type Msg = { id: string; platform: Platform; user: string; color: string | null; text: string };
type Link = "idle" | "connecting" | "ok" | "error";
export type ChatDefaults = { twitch: string; kick: string; youtube: string };

const KEEP = 150;
const PLATFORM = {
  twitch: { label: "Twitch", icon: siTwitch },
  kick: { label: "Kick", icon: siKick },
  youtube: { label: "YouTube", icon: siYoutube },
} as const;

const clean = (v: string) => v.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(twitch\.tv|kick\.com)\//i, "").split(/[/?#]/)[0].toLowerCase();
function Icon({ p, size = 14 }: { p: keyof typeof PLATFORM; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={`#${PLATFORM[p].icon.hex}`} aria-label={PLATFORM[p].label} role="img" className="shrink-0">
      <path d={PLATFORM[p].icon.path} />
    </svg>
  );
}

/** Connexion WebSocket qui se rétablit toute seule (délai croissant, 20 s au plus). */
function useSocket(url: string | null, onOpen: (ws: WebSocket) => void, onMessage: (ws: WebSocket, data: string) => void, setLink: (l: Link) => void) {
  const open = useRef(onOpen);
  const message = useRef(onMessage);
  useEffect(() => {
    open.current = onOpen;
    message.current = onMessage;
  });
  useEffect(() => {
    if (!url) return;
    let stopped = false;
    let ws: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;
    const connect = (retry: boolean) => {
      if (retry) setLink("connecting");
      ws = new WebSocket(url);
      ws.onopen = () => {
        tries = 0;
        open.current(ws!);
      };
      ws.onmessage = (e) => message.current(ws!, String(e.data));
      ws.onclose = () => {
        if (stopped) return;
        setLink("error");
        timer = setTimeout(() => connect(true), Math.min(20000, 1500 * 2 ** tries++));
      };
      ws.onerror = () => ws?.close();
    };
    connect(false);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [url, setLink]);
}

function parseTwitch(line: string): Msg | null {
  // @badge-info=;color=#FF0000;display-name=Nom;id=... :nom!nom@nom.tmi.twitch.tv PRIVMSG #chaine :texte
  const m = line.match(/^@(\S+) :(\w+)!\S+ PRIVMSG #\S+ :(.*)$/);
  if (!m) return null;
  const tags = Object.fromEntries(m[1].split(";").map((t) => t.split("=") as [string, string]));
  return {
    id: `t-${tags.id ?? Math.random()}`,
    platform: "twitch",
    user: tags["display-name"] || m[2],
    color: /^#[0-9a-f]{6}$/i.test(tags.color) ? tags.color : null,
    text: m[3].replace(/^\u0001ACTION (.*)\u0001$/, "$1"),
  };
}

type Accounts = { connections: Partial<Record<keyof typeof PLATFORM, string>>; configured: Record<string, boolean> };
type P = keyof typeof PLATFORM;

const SEND_ERRORS: Record<string, string> = {
  not_connected: "Reconnecte ton compte pour écrire.",
  expired: "Ta connexion a expiré. Reconnecte ton compte.",
  forbidden: "La plateforme refuse l'envoi (chat réservé aux abonnés, ou compte limité).",
  rate_limited: "Doucement : trop de messages d'affilée.",
  no_live_chat: "Aucun direct YouTube actif pour cette adresse.",
  channel_not_found: "Chaîne introuvable.",
  too_long: "Message trop long pour cette plateforme.",
  rejected: "Le message a été refusé par la plateforme.",
  bad_channel: "Chaîne invalide : vérifie les réglages.",
};

export default function MultiChat({ defaults, height = "h-[34rem]", compact = false, notice }: { defaults: ChatDefaults; height?: string; compact?: boolean; notice?: string }) {
  const [editing, setEditing] = useState(false);
  const [ytDetected, setYtDetected] = useState("");
  // Plateformes affichées : on peut en choisir une ou plusieurs (Twitch et Kick dans le même fil, YouTube dans son panneau).
  const [sel, setSel] = useState<Set<P>>(new Set<P>(["youtube", "twitch", "kick"]));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [twitchLink, setTwitchLink] = useState<Link>("idle");
  const [kickLink, setKickLink] = useState<Link>("idle");
  const [ytLink, setYtLink] = useState<Link>("idle");
  const [room, setRoom] = useState<{ slug: string; id?: number; failed?: boolean } | null>(null);
  const [stuck, setStuck] = useState(true);
  const list = useRef<HTMLDivElement>(null);
  const [acc, setAcc] = useState<Accounts | null>(null);
  const [targets, setTargets] = useState<Set<P>>(new Set());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Les messages arrivent par rafales : on les met en file et on les affiche à cadence régulière (plus vite si la file grossit).
  const queue = useRef<Msg[]>([]);
  // Comptes reliés pour écrire (jetons côté serveur : on ne reçoit que les noms).
  const loadAccounts = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/connections", { cache: "no-store" });
      if (!r.ok) return;
      const a = (await r.json()) as Accounts;
      setAcc(a);
      setTargets((cur) => (cur.size ? new Set([...cur].filter((p) => a.connections[p])) : new Set(Object.keys(a.connections) as P[])));
    } catch {}
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts();
  }, [loadAccounts]);

  const push = useCallback((m: Msg) => {
    if (queue.current.length < 400) queue.current.push(m);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      const q = queue.current;
      if (!q.length) return;
      const batch = q.splice(0, Math.max(1, Math.ceil(q.length / 8)));
      setMsgs((cur) => {
        const seen = new Set(cur.map((x) => x.id));
        const add = batch.filter((m) => !seen.has(m.id));
        return add.length ? [...cur, ...add].slice(-KEEP) : cur;
      });
    }, 120);
    return () => clearInterval(t);
  }, []);

  // Les chaînes viennent des comptes reliés (rien à saisir) ; à défaut, de celles du profil.
  const twitch = clean(acc?.connections.twitch ?? defaults.twitch);
  useSocket(
    /^\w{3,25}$/.test(twitch) ? "wss://irc-ws.chat.twitch.tv:443" : null,
    (ws) => {
      ws.send("CAP REQ :twitch.tv/tags");
      ws.send("PASS SCHMOOZE");
      ws.send(`NICK justinfan${Math.floor(10000 + Math.random() * 89999)}`);
      ws.send(`JOIN #${twitch}`);
    },
    (ws, data) => {
      for (const line of data.split("\r\n")) {
        if (line.startsWith("PING")) ws.send("PONG :tmi.twitch.tv");
        else if (line.includes(" 366 ")) setTwitchLink("ok");
        else {
          const m = parseTwitch(line);
          if (m) push(m);
        }
      }
    },
    setTwitchLink,
  );

  const kick = clean(acc?.connections.kick ? acc.connections.kick.replace(/_/g, "-") : defaults.kick);
  const kickOk = /^[\w-]{3,25}$/.test(kick);
  const kickRoom = room?.slug === kick ? (room.id ?? null) : null;
  useEffect(() => {
    if (!kickOk) return;
    let stopped = false;
    fetch(`/api/kick/chatroom?slug=${encodeURIComponent(kick)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { id: number }) => !stopped && setRoom({ slug: kick, id: d.id }))
      .catch(() => !stopped && setRoom({ slug: kick, failed: true }));
    return () => {
      stopped = true;
    };
  }, [kick, kickOk]);
  useSocket(
    kickRoom ? "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false" : null,
    (ws) => ws.send(JSON.stringify({ event: "pusher:subscribe", data: { auth: "", channel: `chatrooms.${kickRoom}.v2` } })),
    (_ws, data) => {
      try {
        const e = JSON.parse(data) as { event: string; data?: string };
        if (e.event === "pusher_internal:subscription_succeeded") setKickLink("ok");
        if (e.event !== "App\\Events\\ChatMessageEvent" || !e.data) return;
        const d = JSON.parse(e.data) as { id: string; content: string; sender: { username: string; identity?: { color?: string } } };
        push({ id: `k-${d.id}`, platform: "kick", user: d.sender.username, color: d.sender.identity?.color ?? null, text: d.content.replace(/\[emote:\d+:([^\]]+)\]/g, "$1") });
      } catch {}
    },
    setKickLink,
  );

  // YouTube : pas de connexion en direct, on sonde l'API à la cadence qu'elle indique (route /api/youtube/chat).
  const ytConnected = !!acc?.connections.youtube;
  const ytVideo = ytConnected ? ytDetected : "";
  // Direct YouTube en cours du compte relié : trouvé tout seul (rien à coller), recherché toutes les 45 s tant qu'il n'y en a pas.
  useEffect(() => {
    if (!ytConnected) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const look = async () => {
      let next = 45_000;
      try {
        const r = await fetch("/api/youtube/live", { cache: "no-store" });
        if (r.ok) {
          const j = (await r.json()) as { videoId: string | null };
          if (!stopped) setYtDetected(j.videoId ?? "");
        }
      } catch {
        next = 20_000;
      }
      if (!stopped) timer = setTimeout(look, next);
    };
    void look();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [ytConnected]);

  useEffect(() => {
    if (!ytVideo) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let after = "";
    const tick = async () => {
      let wait = 12_000;
      try {
        const r = await fetch(`/api/youtube/chat?v=${ytVideo}${after ? `&after=${encodeURIComponent(after)}` : ""}`, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { messages: { id: string; user: string; text: string }[]; next: string; interval: number };
        if (stopped) return;
        after = j.next || after;
        setYtLink("ok");
        for (const m of j.messages) push({ id: `y-${m.id}`, platform: "youtube", user: m.user, color: null, text: m.text });
        wait = Math.min(15_000, Math.max(3_000, j.interval));
      } catch {
        if (!stopped) setYtLink("error");
      }
      if (!stopped) timer = setTimeout(tick, wait);
    };
    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [ytVideo, push]);

  const ytId = ytVideo;
  const channelOf: Record<P, string> = { twitch: twitch, kick: kick, youtube: ytId };
  const sendable = (Object.keys(acc?.connections ?? {}) as P[]).filter((p) => channelOf[p]);
  const connectable = (["youtube", "twitch", "kick"] as const).filter((p) => acc?.configured[p] && !acc.connections[p]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const to = sendable.filter((p) => targets.has(p));
    if (!text.trim() || !to.length || sending) return;
    setSending(true);
    setSendError(null);
    const results = await Promise.all(
      to.map(async (p) => {
        try {
          const r = await fetch("/api/chat/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: p, channel: channelOf[p], text }) });
          if (r.ok) return null;
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          return `${PLATFORM[p].label} : ${SEND_ERRORS[j.error ?? ""] ?? "envoi impossible."}`;
        } catch {
          return `${PLATFORM[p].label} : réseau indisponible.`;
        }
      }),
    );
    const errors = results.filter(Boolean) as string[];
    if (errors.length) setSendError(errors.join(" "));
    if (errors.length < to.length) setText("");
    setSending(false);
  }

  async function disconnect(p: P) {
    await fetch(`/api/chat/connections?platform=${p}`, { method: "DELETE" });
    await loadAccounts();
  }
  const available: Record<P, boolean> = { twitch: !!twitch, kick: !!kick, youtube: !!ytId };
  const active = (["youtube", "twitch", "kick"] as const).filter((p) => sel.has(p) && available[p]);
  const allOn = active.length > 0 && active.length === (["youtube", "twitch", "kick"] as const).filter((p) => available[p]).length;
  const shown = msgs.filter((m) => active.includes(m.platform));
  const none = !twitch && !kick && !ytId;
  // Un clic sur un logo ajoute ou retire la plateforme ; il en reste toujours au moins une.
  const toggle = (p: P) =>
    setSel((cur) => {
      const next = new Set(cur);
      if (next.has(p)) {
        next.delete(p);
        if (!(["youtube", "twitch", "kick"] as const).some((x) => next.has(x) && available[x])) return cur;
      } else next.add(p);
      return next;
    });
  const dot = (l: Link) => (l === "ok" ? "bg-live" : l === "error" ? "bg-red-400" : l === "connecting" ? "animate-pulse bg-muted motion-reduce:animate-none" : "border border-muted");
  const links: Record<Platform, Link> = {
    twitch: !/^\w{3,25}$/.test(twitch) ? "idle" : twitchLink === "idle" ? "connecting" : twitchLink,
    youtube: !ytVideo ? "idle" : ytLink === "idle" ? "connecting" : ytLink,
    kick: !kickOk ? "idle" : room?.slug === kick && room.failed ? "error" : kickRoom && kickLink !== "idle" ? kickLink : "connecting",
  };

  return (
    <section aria-label="Multichat" className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ${height}`}>
      <header className={`flex items-center border-b border-line p-2.5 ${compact ? "gap-1.5" : "flex-wrap gap-2"}`}>
        <button
          type="button"
          aria-pressed={allOn}
          onClick={() => setSel(new Set<P>(["youtube", "twitch", "kick"]))}
          className={`min-h-9 rounded-lg px-3 text-sm transition-colors ${allOn ? "bg-accent text-on-accent" : "border border-line text-muted hover:text-foreground"}`}
        >
          Tout
        </button>
        <div className="flex items-center gap-1" role="group" aria-label="Plateformes affichées">
          {(["youtube", "twitch", "kick"] as const).map((p) => {
            const on = sel.has(p) && available[p];
            const state = links[p];
            return (
              <button
                key={p}
                type="button"
                aria-pressed={on}
                disabled={!available[p]}
                title={available[p] ? PLATFORM[p].label : p === "youtube" ? (ytConnected ? "Aucun direct YouTube en cours" : "Connecte ton compte YouTube (roue)") : `Connecte ton compte ${PLATFORM[p].label} (roue)`}
                onClick={() => toggle(p)}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors disabled:opacity-40 ${on ? "border-line-strong bg-foreground/10 text-foreground" : "border-line text-muted opacity-60 hover:opacity-100"}`}
              >
                <Icon p={p} />
                <span className={compact ? "sr-only" : "sr-only sm:not-sr-only"}>{PLATFORM[p].label}</span>
                <span
                  className={`h-2 w-2 rounded-full ${dot(state)}`}
                  role="img"
                  aria-label={state === "ok" ? "connecté" : state === "error" ? "reconnexion" : state === "connecting" ? "connexion" : "non configuré"}
                />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          aria-label="Comptes reliés"
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground"
        >
          <Gear size={18} />
        </button>
      </header>

      {editing && (
        <div className="space-y-2 border-b border-line p-3">
          <p className="text-xs text-muted">Comptes reliés : ton chat et l&apos;envoi de messages viennent de là, rien à saisir.</p>
          <ul className="flex flex-wrap gap-2">
            {(["youtube", "twitch", "kick"] as const).map((p) => {
              const who = acc?.connections[p];
              if (!who && !acc?.configured[p]) return null;
              return (
                <li key={p} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                  <Icon p={p} />
                  {who ? (
                    <>
                      <span className="max-w-[10rem] truncate">{who}</span>
                      <button type="button" onClick={() => disconnect(p)} className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
                        Déconnecter
                      </button>
                    </>
                  ) : (
                    <a href={`/api/chat/connect/${p}`} className="text-muted underline-offset-4 hover:text-foreground hover:underline">
                      Connecter {PLATFORM[p].label}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {none ? (
        <p className="m-auto max-w-xs p-6 text-center text-sm text-muted">
          Aucun compte relié. Ouvre la roue et connecte ton compte YouTube, Twitch ou Kick : ton chat apparaît tout seul.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
          {/* Colonne inversée : le bas du fil est l'origine du défilement, donc un nouveau message pousse les autres vers le haut tout seul. */}
          <div
            ref={list}
            role="log"
            aria-live="off"
            aria-label="Messages du chat"
            tabIndex={0}
            onScroll={(e) => setStuck(Math.abs(e.currentTarget.scrollTop) < 40)}
            className="flex h-full flex-col-reverse overflow-y-auto overscroll-contain px-3 py-2 text-sm"
          >
            {shown.length === 0 && (
              <div className="m-auto flex flex-col items-center gap-3 px-6 text-center text-muted">
                <span className="flex items-center gap-3">
                  {ytVideo && <Icon p="youtube" size={20} />}
                  {twitch && <Icon p="twitch" size={20} />}
                  {kick && <Icon p="kick" size={20} />}
                </span>
                <p>En attente des premiers messages…</p>
              </div>
            )}
            {[...shown].reverse().map((m) => (
              <div key={m.id} className="chat-row">
                <div>
                  <p className="break-words py-0.5 leading-snug [overflow-wrap:anywhere]">
                    <span className="mr-1.5 inline-block align-[-2px]">
                      <Icon p={m.platform} size={compact ? 12 : 14} />
                    </span>
                    <span className="font-semibold" style={m.color ? { color: m.color } : undefined}>
                      {m.user}
                    </span>
                    <span className="text-foreground">: {m.text}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!stuck && (
            <button
              type="button"
              onClick={() => list.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line-strong bg-background px-4 py-2 text-xs text-foreground shadow-lg"
            >
              Revenir en bas
            </button>
          )}
        </div>
        </div>
      )}
      {(sendable.length > 0 || connectable.length > 0 || notice || sendError) && (
        <div className="border-t border-line p-2.5">
          {notice && <p role="status" className="mb-2 text-xs text-muted">{notice}</p>}
          {sendable.length > 0 ? (
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Envoyer vers">
                {sendable.map((p) => {
                  const on = targets.has(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      title={`Écrire sur ${PLATFORM[p].label} (${acc?.connections[p]})`}
                      onClick={() => setTargets((s) => new Set(on ? [...s].filter((x) => x !== p) : [...s, p]))}
                      className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${on ? "border-line-strong bg-foreground/10" : "border-line opacity-50 hover:opacity-100"}`}
                    >
                      <Icon p={p} size={16} />
                    </button>
                  );
                })}
              </div>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder="Écrire un message"
                aria-label="Message du chat"
                autoComplete="off"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                type="submit"
                disabled={sending || !text.trim() || ![...targets].some((p) => sendable.includes(p))}
                className="h-10 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </form>
          ) : (
            connectable.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>Connecte un compte pour écrire :</span>
                {connectable.map((p) => (
                  <a key={p} href={`/api/chat/connect/${p}`} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line px-3 text-foreground transition-colors hover:bg-foreground/10">
                    <Icon p={p} size={14} />
                    {PLATFORM[p].label}
                  </a>
                ))}
              </div>
            )
          )}
          {sendError && (
            <p role="alert" className="mt-2 text-xs text-red-400/90">
              {sendError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
