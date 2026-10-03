"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { siKick, siTwitch, siYoutube } from "simple-icons";
import { Gear } from "@phosphor-icons/react";

// Multichat : Twitch et Kick dans un seul fil (lecture seule, connexion anonyme directement depuis le navigateur),
// YouTube dans un onglet à part (son chat n'est lisible que dans son propre lecteur).
// Les chaînes viennent du profil ; on peut les changer ici (gardé dans ce navigateur).

type Platform = "twitch" | "kick";
type Msg = { id: string; platform: Platform; user: string; color: string | null; text: string };
type Link = "idle" | "connecting" | "ok" | "error";
export type ChatDefaults = { twitch: string; kick: string; youtube: string };

const STORE = "syxtee.multichat";
const KEEP = 150;
const PLATFORM = {
  twitch: { label: "Twitch", icon: siTwitch },
  kick: { label: "Kick", icon: siKick },
  youtube: { label: "YouTube", icon: siYoutube },
} as const;

const clean = (v: string) => v.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(twitch\.tv|kick\.com)\//i, "").split(/[/?#]/)[0].toLowerCase();
/** Identifiant d'une vidéo YouTube à partir d'une adresse (watch, live, youtu.be) ou de l'identifiant seul. */
function youtubeId(v: string) {
  const t = v.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : "";
}

function Icon({ p, size = 14 }: { p: keyof typeof PLATFORM; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-label={PLATFORM[p].label} role="img" className="shrink-0">
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

export default function MultiChat({ defaults, height = "h-[34rem]", compact = false }: { defaults: ChatDefaults; height?: string; compact?: boolean }) {
  const [cfg, setCfg] = useState<ChatDefaults>(defaults);
  const [draft, setDraft] = useState<ChatDefaults>(defaults);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"all" | "youtube">("all");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [twitchLink, setTwitchLink] = useState<Link>("idle");
  const [kickLink, setKickLink] = useState<Link>("idle");
  const [room, setRoom] = useState<{ slug: string; id?: number; failed?: boolean } | null>(null);
  const [hidden, setHidden] = useState<Set<Platform>>(new Set());
  const [stuck, setStuck] = useState(true);
  const list = useRef<HTMLDivElement>(null);

  // Réglages gardés dans ce navigateur, sinon ceux du profil. Lus après l'hydratation (localStorage n'existe pas côté serveur).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<ChatDefaults> | null;
      if (saved) {
        const next = { twitch: saved.twitch ?? defaults.twitch, kick: saved.kick ?? defaults.kick, youtube: saved.youtube ?? defaults.youtube };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCfg(next);
        setDraft(next);
      }
    } catch {}
  }, [defaults.twitch, defaults.kick, defaults.youtube]);

  const push = useCallback((m: Msg) => setMsgs((cur) => (cur.some((x) => x.id === m.id) ? cur : [...cur.slice(-(KEEP - 1)), m])), []);

  const twitch = clean(cfg.twitch);
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

  const kick = clean(cfg.kick);
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

  // Suit le bas du fil, sauf si on remonte lire plus haut.
  useEffect(() => {
    if (stuck && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [msgs, hidden, stuck, tab]);

  function save() {
    setCfg(draft);
    setMsgs([]);
    try {
      localStorage.setItem(STORE, JSON.stringify(draft));
    } catch {}
    setEditing(false);
  }

  const ytId = youtubeId(cfg.youtube);
  const shown = msgs.filter((m) => !hidden.has(m.platform));
  const none = !twitch && !kick;
  const dot = (l: Link) => (l === "ok" ? "bg-live" : l === "error" ? "bg-red-400" : l === "connecting" ? "animate-pulse bg-muted motion-reduce:animate-none" : "border border-muted");
  const links: Record<Platform, Link> = {
    twitch: !/^\w{3,25}$/.test(twitch) ? "idle" : twitchLink === "idle" ? "connecting" : twitchLink,
    kick: !kickOk ? "idle" : room?.slug === kick && room.failed ? "error" : kickRoom && kickLink !== "idle" ? kickLink : "connecting",
  };
  const field =
    "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-line-strong focus:outline-none focus:ring-2 focus:ring-foreground/20";

  return (
    <section aria-label="Multichat" className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-surface ${height}`}>
      <header className="flex flex-wrap items-center gap-2 border-b border-line p-2.5">
        <div role="group" aria-label="Affichage" className="flex rounded-lg border border-line bg-background p-0.5">
          {(["all", "youtube"] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`min-h-9 rounded-md px-3 text-sm transition-colors ${tab === t ? "bg-accent text-on-accent" : "text-muted hover:text-foreground"}`}
            >
              {t === "all" ? "Tout" : "YouTube"}
            </button>
          ))}
        </div>
        {tab === "all" && (
          <div className="flex items-center gap-1" role="group" aria-label="Plateformes affichées">
            {(["twitch", "kick"] as const).map((p) => {
              const on = !hidden.has(p);
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={on}
                  disabled={!(p === "twitch" ? twitch : kick)}
                  onClick={() => setHidden((s) => (on ? new Set([...s, p]) : new Set([...s].filter((x) => x !== p))))}
                  className={`flex min-h-9 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors disabled:opacity-40 ${on ? "border-line-strong text-foreground" : "border-line text-muted line-through"}`}
                >
                  <Icon p={p} />
                  <span className="sr-only sm:not-sr-only">{PLATFORM[p].label}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${dot(links[p])}`}
                    role="img"
                    aria-label={links[p] === "ok" ? "connecté" : links[p] === "error" ? "reconnexion" : links[p] === "connecting" ? "connexion" : "non configuré"}
                  />
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          aria-label="Régler les chaînes"
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-foreground/10 hover:text-foreground"
        >
          <Gear size={18} />
        </button>
      </header>

      {editing && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="grid gap-3 border-b border-line p-3 sm:grid-cols-3"
        >
          {(["twitch", "kick", "youtube"] as const).map((p) => (
            <label key={p} className="space-y-1.5 text-xs text-muted">
              {p === "youtube" ? "YouTube : adresse du direct" : `${PLATFORM[p].label} : chaîne`}
              <input
                value={draft[p]}
                onChange={(e) => setDraft({ ...draft, [p]: e.target.value })}
                placeholder={p === "youtube" ? "https://youtube.com/live/..." : "pseudo"}
                className={field}
                spellCheck={false}
                autoCapitalize="none"
              />
            </label>
          ))}
          <div className="sm:col-span-3">
            <button type="submit" className="h-11 rounded-lg bg-accent px-5 text-sm font-medium text-on-accent hover:bg-accent-hover">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {tab === "youtube" ? (
        ytId ? (
          <iframe
            title="Chat YouTube"
            src={`https://www.youtube.com/live_chat?v=${ytId}&embed_domain=${typeof location === "undefined" ? "" : location.hostname}&dark_theme=1`}
            className="min-h-0 w-full flex-1 border-0"
          />
        ) : (
          <p className="m-auto max-w-xs p-6 text-center text-sm text-muted">Colle l&apos;adresse de ton direct YouTube dans les réglages (la roue) pour afficher son chat ici.</p>
        )
      ) : none ? (
        <p className="m-auto max-w-xs p-6 text-center text-sm text-muted">
          Aucune chaîne. Ouvre les réglages (la roue) et indique ta chaîne Twitch ou Kick. Les deux se mélangent dans ce fil.
        </p>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div
            ref={list}
            role="log"
            aria-live="off"
            aria-label="Messages du chat"
            tabIndex={0}
            onScroll={(e) => {
              const el = e.currentTarget;
              setStuck(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
            }}
            className="h-full space-y-1 overflow-y-auto overscroll-contain px-3 py-2 text-sm"
          >
            {shown.length === 0 && <p className="pt-6 text-center text-muted">En attente de messages…</p>}
            {shown.map((m) => (
              <p key={m.id} className="break-words leading-snug [overflow-wrap:anywhere]">
                <span className="mr-1.5 inline-block align-[-2px] text-muted">
                  <Icon p={m.platform} size={compact ? 12 : 14} />
                </span>
                <span className="font-semibold" style={m.color ? { color: m.color } : undefined}>
                  {m.user}
                </span>
                <span className="text-foreground">: {m.text}</span>
              </p>
            ))}
          </div>
          {!stuck && (
            <button
              type="button"
              onClick={() => setStuck(true)}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-line-strong bg-background px-4 py-2 text-xs text-foreground shadow-lg"
            >
              Revenir en bas
            </button>
          )}
        </div>
      )}
    </section>
  );
}
