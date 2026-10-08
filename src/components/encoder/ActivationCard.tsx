"use client";

import { useState } from "react";
import { activateEncoderAction } from "@/app/(dashboard)/dashboard/appareils/activation";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ToastProvider, useToast } from "../ui/Toast";

// Activation de l'Encodeur : le code fourni avec le boîtier offre des mois de l'abonnement le plus élevé. Un code ne sert que sur un seul compte.
function Inner({ codes, bonusMonths }: { codes: string[]; bonusMonths: number }) {
  const toast = useToast();
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [msg, setMsg] = useState("");
  // Format XXXX-XXXX-XXXX appliqué à la saisie et au collage.
  const fmt = (v: string) => {
    const c = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
    return [c.slice(0, 4), c.slice(4, 8), c.slice(8)].filter(Boolean).join("-");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.replace(/-/g, "").length !== 12) return;
    setState("loading");
    const r = await activateEncoderAction(code);
    if (r.error) {
      setState("error");
      setMsg(r.error);
      toast(r.error, "error");
      return;
    }
    setState("success");
    const until = r.until ? new Date(r.until).toLocaleDateString("fr-FR", { dateStyle: "long" }) : "";
    setMsg(`${r.months} mois de l'abonnement Extra offerts, jusqu'au ${until}.`);
    toast("Encodeur activé.");
  }

  return (
    <Card title="Activer mon Encodeur">
      <p className="max-w-[62ch] text-sm leading-relaxed text-muted">
        Entre le code fourni avec ton Encodeur : <span className="text-foreground">{bonusMonths} mois de l&apos;abonnement le plus élevé</span> sont offerts sur ton compte. Le code ne fonctionne que sur un seul compte.
      </p>
      {codes.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-background/60 p-4 text-sm">
          <p className="text-muted">Ton code d&apos;activation (lié à ta commande) :</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {codes.map((c) => (
              <li key={c}><button type="button" onClick={() => { setCode(c); navigator.clipboard?.writeText(c).catch(() => {}); }} className="rounded-lg border border-line-strong bg-surface-2 px-3 py-1.5 font-mono tabular-nums hover:border-foreground/40">{c}</button></li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={submit} className="mt-5 flex flex-wrap items-start gap-3">
        <div className="grid gap-2">
          <label htmlFor="act-code" className="text-sm text-muted">Code d&apos;activation</label>
          <input
            id="act-code"
            value={code}
            onChange={(e) => setCode(fmt(e.target.value))}
            onPaste={(e) => { e.preventDefault(); setCode(fmt(e.clipboardData.getData("text"))); }}
            disabled={state === "loading" || state === "success"}
            autoComplete="off"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX"
            aria-invalid={state === "error"}
            className={`h-11 w-[18rem] rounded-xl border bg-input px-4 font-mono text-base tracking-[0.15em] tabular-nums placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 ${state === "error" ? "border-bad/60" : "border-line focus:border-foreground/50"}`}
          />
          <p role={state === "error" ? "alert" : "status"} className={`min-h-4 text-xs ${state === "error" ? "text-bad" : state === "success" ? "text-ok" : "text-muted"}`}>{msg}</p>
        </div>
        <div className="pt-[1.75rem]">
          <Button type="submit" loading={state === "loading"} disabled={code.replace(/-/g, "").length !== 12 || state === "success"}>{state === "success" ? "Activé" : "Activer"}</Button>
        </div>
      </form>
    </Card>
  );
}

export default function ActivationCard(props: { codes: string[]; bonusMonths: number }) {
  return (
    <ToastProvider>
      <Inner {...props} />
    </ToastProvider>
  );
}
