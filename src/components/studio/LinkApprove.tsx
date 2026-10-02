"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { coreFetch } from "../dashboard/coreClient";

// Confirmation de la connexion d'un ordinateur (plugin SYXTEE Link) au compte. Le code vient d'OBS ; rien n'est autorisé sans clic.

type Info = { name: string; platform: string };
const OS: Record<string, string> = { darwin: "macOS", win32: "Windows", linux: "Linux" };
const btn = "inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full px-6 text-sm font-medium transition-colors";

export default function LinkApprove({ code: initial, coreUrl }: { code: string; coreUrl: string }) {
  const [code, setCode] = useState(initial);
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "invalid" | "denied" | "done" | "error">(initial ? "loading" : "idle");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!initial) return;
    let live = true;
    coreFetch(coreUrl, `/v1/me/link/approve?code=${encodeURIComponent(initial)}`)
      .then(async (r) => {
        if (!live) return;
        if (r.ok) {
          setInfo(await r.json());
          setState("idle");
        } else setState(r.status === 403 ? "denied" : r.status === 404 ? "invalid" : "error");
      })
      .catch(() => live && setState("error"));
    return () => {
      live = false;
    };
  }, [initial, coreUrl]);

  async function lookup(c: string) {
    setState("loading");
    const r = await coreFetch(coreUrl, `/v1/me/link/approve?code=${encodeURIComponent(c)}`).catch(() => null);
    if (r?.ok) {
      setInfo(await r.json());
      setState("idle");
    } else setState(r?.status === 403 ? "denied" : r?.status === 404 ? "invalid" : "error");
  }

  async function approve() {
    setBusy(true);
    const r = await coreFetch(coreUrl, "/v1/me/link/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) }).catch(() => null);
    setBusy(false);
    setState(r?.ok ? "done" : r?.status === 403 ? "denied" : r?.status === 404 ? "invalid" : "error");
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">SYXTEE Link</p>
      {state === "done" ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">C&apos;est connecté.</h1>
          <p className="mt-3 text-sm text-muted">
            Retourne dans OBS : SYXTEE Link te propose de <strong>sauvegarder tes scènes</strong> avant de commencer. Ensuite, tout se commande depuis SYXTEE Studio.
          </p>
          <Link href="/studio" className={`${btn} mt-6 bg-accent text-on-accent hover:bg-accent-hover`}>
            Ouvrir SYXTEE Studio
          </Link>
        </>
      ) : state === "denied" ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Accès sur invitation</h1>
          <p className="mt-3 text-sm text-muted">Ton compte n&apos;a pas encore l&apos;accès à SYXTEE Link et au Studio. Demande ton accès.</p>
          <a href="/acces" className={`${btn} mt-6 bg-accent text-on-accent hover:bg-accent-hover`}>
            Demander l\'accès
          </a>
        </>
      ) : info ? (
        <>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Connecter cet ordinateur ?</h1>
          <p className="mt-3 text-sm text-muted">
            <strong>{info.name}</strong>
            {info.platform ? ` (${OS[info.platform] ?? info.platform})` : ""} veut se relier à ton compte pour que SYXTEE Studio commande son OBS et sauvegarde tes scènes.
          </p>
          <p className="mt-2 text-xs text-muted">Le code affiché dans OBS est le même : {code.replace(/(.{4})(.{4})/, "$1 $2")}. Si tu n&apos;as rien lancé, ferme cette page.</p>
          {state === "error" && <p role="alert" className="mt-3 text-sm text-red-400">Impossible de confirmer pour le moment. Réessaie.</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={approve} disabled={busy} className={`${btn} bg-accent text-on-accent hover:bg-accent-hover disabled:opacity-50`}>
              {busy ? "Connexion…" : "Autoriser"}
            </button>
            <Link href="/dashboard" className={`${btn} border border-line-strong hover:bg-accent/10`}>
              Annuler
            </Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Connecter OBS</h1>
          <p className="mt-3 text-sm text-muted">
            {state === "loading"
              ? "Vérification du code…"
              : state === "invalid"
                ? "Ce code est invalide ou expiré. Relance la connexion depuis SYXTEE Link dans OBS."
                : state === "error"
                  ? "Le serveur ne répond pas. Réessaie dans un instant."
                  : "Entre le code affiché par SYXTEE Link dans OBS."}
          </p>
          {state !== "loading" && (
            <form
              className="mt-5 flex gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (code) void lookup(code);
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
                placeholder="CODE"
                aria-label="Code de connexion"
                autoComplete="off"
                spellCheck={false}
                className="h-12 w-full rounded-xl border border-line bg-background px-4 text-center font-mono text-lg uppercase tracking-[0.3em]"
              />
              <button type="submit" className={`${btn} bg-accent text-on-accent hover:bg-accent-hover`}>
                Valider
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
