"use client";

import { useState, type ReactNode } from "react";
import type { Trigger } from "./types";
import { btn, btnPrimary, Confirm, cx, Row, Select, Sheet, Switch, type ConfirmAsk } from "./ui";
import type { Obs } from "./useObs";

// Régie automatique : une seule protection, simple. Quand l'image se fige ou que la connexion coupe, SYXTEE passe sur la scène de
// secours, puis revient sur la scène Live dès que ça repart. Trois réglages : scène Live, scène de secours, sensibilité.
// En dessous, le Gardien relance OBS s'il plante et permet de le démarrer ou le redémarrer à distance.
// Tout est enregistré dans le plugin, sur le PC d'OBS, à chaque changement.

const TRIGGERS: { id: Trigger; title: string; text: string }[] = [
  { id: "cut", title: "Normale", text: "Image figée ou flux coupé. Conseillé." },
  { id: "cut_lowbitrate", title: "Anticipée", text: "Aussi quand le débit tombe sous 300 kbit/s." },
  { id: "sensitive", title: "Très réactive", text: "Dès 2 s d'image figée ou sous 800 kbit/s. Peut déclencher trop souvent." },
];

/** Désactive tout ce qui n'existe plus dans la régie (drone, autres caméras, garde audio, régie IA) : un ancien réglage ne tourne pas en cachette. */
const NO_EXTRAS = { autoEnabled: false, directorEnabled: false, audioEnabled: false, audioBackup: false } as const;

const Heading = ({ children }: { children: ReactNode }) => <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted">{children}</h3>;

function GuardianBlock({ o }: { o: Obs }) {
  const g = o.guardian;
  const s = g.status ?? {};
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<ConfirmAsk>(null);
  const obsOpen = s.obs === true;
  const launching = s.launching === true;
  const gaveUp = s.gaveUp === true;

  async function act(method: string, params?: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await o.call(method, params);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!g.online)
    return (
      <p className="rounded-xl border border-line px-4 py-3 text-[13px] leading-relaxed text-muted">
        Le Gardien SYXTEE n&apos;est pas en ligne sur ce Mac. Mets à jour SYXTEE Link (0.8.0 ou plus) et ouvre-le : le Gardien reste actif même quand OBS est fermé ou planté, et permet de le relancer d&apos;ici.
      </p>
    );

  const text = launching ? "Relance d'OBS en cours…" : gaveUp ? "OBS a planté 3 fois en 15 minutes : la relance automatique est suspendue." : obsOpen ? "OBS est ouvert." : "OBS est fermé sur ce Mac.";
  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3 py-1">
        <p role="status" className={cx("flex items-center gap-2 text-sm", gaveUp ? "text-warn" : "text-foreground")}>
          <span aria-hidden="true" className={cx("size-2 rounded-full", gaveUp ? "bg-warn" : obsOpen ? "bg-ok" : "border border-faint")} />
          {text}
        </p>
        {!obsOpen ? (
          <button type="button" disabled={busy || launching || !o.owner} onClick={() => void act("guardian.launchObs")} className={btnPrimary()}>
            Démarrer OBS
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !o.owner}
            onClick={() => setAsk({ title: "Redémarrer OBS ?", text: "OBS se ferme puis se rouvre. Le direct est repris s'il était actif et que la reprise est activée.", ok: "Redémarrer OBS", danger: true, run: () => void act("guardian.restartObs") })}
            className={btn()}
          >
            Redémarrer OBS
          </button>
        )}
      </div>
      <div className="divide-y divide-line">
        <Row title="Relancer OBS s'il plante" text="Si OBS se ferme sans que tu l'aies demandé, il se rouvre tout seul (3 fois maximum en 15 minutes).">
          <Switch label="Relancer OBS s'il plante" on={s.watch === true} disabled={busy || !o.owner} onClick={() => void act("guardian.setWatch", { enabled: s.watch !== true })} />
        </Row>
        <Row title="Reprendre le direct après la relance" text="Si tu étais en direct au moment du plantage, le direct repart dès qu'OBS est rouvert.">
          <Switch label="Reprendre le direct après la relance" on={s.resume === true} disabled={busy || !o.owner} onClick={() => void act("guardian.setResume", { enabled: s.resume !== true })} />
        </Row>
      </div>
      {!o.owner && <p className="text-[13px] text-muted">Seul le propriétaire du compte peut démarrer, redémarrer ou régler OBS.</p>}
      {error && (
        <p role="alert" className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[13px] text-warn">
          {error}
        </p>
      )}
      <Confirm ask={ask} onClose={() => setAsk(null)} />
    </div>
  );
}

export default function AutoSheet({ o, open, onClose }: { o: Obs; open: boolean; onClose: () => void }) {
  const r = o.roles;
  const { scenes, saveRoles } = o;
  const ready = !!(r?.source && r?.scene && r?.liveScene);
  const on = !!r?.enabled;
  const missing = r ? [!r.liveScene && "ta scène Live", !r.scene && "ta scène de secours", !r.source && "le flux (touche « Corriger » dans la barre du haut)"].filter(Boolean) : [];

  function toggle() {
    if (!r) return;
    if (on) return saveRoles({ enabled: false, ...NO_EXTRAS });
    // Pas encore réglée : on repère les scènes évidentes (Live, secours) ; sinon on active dès que tout est choisi.
    if (!ready) return o.enableAuto();
    saveRoles({ enabled: true, ...NO_EXTRAS });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Régie automatique" size="md">
      {!r ? (
        <p className="text-sm text-muted">Lecture des réglages de la régie…</p>
      ) : (
        <div className="grid gap-7">
          <section aria-label="Protection contre les coupures">
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-foreground/[0.04] p-4">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">Protection contre les coupures</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">Si ton image se fige ou que ta connexion coupe, SYXTEE passe sur ta scène de secours, puis revient sur Live dès que ça repart.</p>
              </div>
              <Switch label="Protection contre les coupures" on={on} onClick={toggle} />
            </div>
            <p role="status" className={cx("mt-3 flex items-center gap-2 text-[13px]", r.state === "backup" || (!on && !ready) ? "text-warn" : "text-muted")}>
              <span aria-hidden="true" className={cx("size-2 rounded-full", r.state === "backup" ? "bg-warn" : on ? "bg-ok" : "border border-faint")} />
              {r.state === "backup" ? "Scène de secours à l'antenne : la connexion est coupée." : on ? "Active : ton flux est surveillé." : ready ? "Éteinte." : "Choisis tes deux scènes ci-dessous pour l'activer."}
            </p>
          </section>

          <section aria-label="Scènes">
            <Heading>Scènes</Heading>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Ta scène Live" value={r.liveScene} options={scenes} onChange={(v) => saveRoles({ liveScene: v })} />
              <Select label="Scène de secours" value={r.scene} options={scenes} onChange={(v) => saveRoles({ scene: v })} />
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">La régie ne touche à rien tant que ta scène Live n&apos;est pas à l&apos;antenne.</p>
            {missing.length > 0 && !r.source && <p className="mt-2 text-[13px] text-warn">Il manque {missing.join(", ")}.</p>}
          </section>

          <section aria-label="Sensibilité">
            <Heading>Quand passer sur le secours ?</Heading>
            <div role="radiogroup" aria-label="Sensibilité" className="grid gap-2 sm:grid-cols-3">
              {TRIGGERS.map((t) => (
                <label key={t.id} className={cx("flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-foreground", r.trigger === t.id ? "border-foreground/50 bg-foreground/[0.06]" : "border-line hover:border-line-strong")}>
                  <input type="radio" name="trigger" checked={r.trigger === t.id} onChange={() => saveRoles({ trigger: t.id })} className="sr-only" />
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span aria-hidden="true" className={cx("size-3 rounded-full border", r.trigger === t.id ? "border-foreground bg-foreground" : "border-faint")} />
                    {t.title}
                  </span>
                  <span className="text-[13px] leading-snug text-muted">{t.text}</span>
                </label>
              ))}
            </div>
          </section>

          <section aria-label="OBS">
            <Heading>Si OBS plante</Heading>
            <GuardianBlock o={o} />
          </section>
        </div>
      )}
    </Sheet>
  );
}
