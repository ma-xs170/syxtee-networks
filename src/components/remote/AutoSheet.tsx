"use client";

import type { ReactNode } from "react";
import type { Provider, Rights, Roles, Trigger } from "./types";
import { btn, btnPrimary, cx, Disclosure, Draft, field, Row, Select, Sheet, Switch } from "./ui";
import type { Obs } from "./useObs";

// Régie automatique : SYXTEE change de scène pour toi. Deux étapes : 1) choisir sa scène Live ; 2) activer ce que l'on veut
// (secours si la connexion coupe, drone et autres caméras, alerte micro, régie IA). Chaque bloc affiche son état : Actif, À compléter, Éteint.
// Tout est enregistré dans le plugin, sur le PC d'OBS, à chaque changement.

const TRIGGERS: { id: Trigger; title: string; text: string }[] = [
  { id: "cut", title: "Normale (conseillé)", text: "Passe sur le secours quand l'image se fige ou que le flux est coupé." },
  { id: "cut_lowbitrate", title: "Anticipée", text: "Passe aussi sur le secours quand le débit tombe sous 300 kbit/s, avant que l'image ne se fige." },
  { id: "sensitive", title: "Très réactive", text: "Réagit dès 2 secondes d'image figée ou sous 800 kbit/s. Peut déclencher un peu trop souvent." },
];

/** État d'un bloc : « Actif » (vert), « À compléter » (ambre : il manque une scène ou une source), « Éteint ». */
function Status({ on, todo }: { on: boolean; todo?: boolean }) {
  const state = on ? "Actif" : todo ? "À compléter" : "Éteint";
  return (
    <span className={cx("flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider", todo && !on ? "text-warn" : "text-muted")}>
      <span aria-hidden="true" className={cx("size-2 rounded-full", on ? "bg-ok" : todo ? "bg-warn" : "border border-faint")} />
      {state}
    </span>
  );
}

const Note = ({ children, tone }: { children: ReactNode; tone?: "warn" }) => <p className={cx("text-[13px] leading-relaxed", tone === "warn" ? "text-warn" : "text-muted")}>{children}</p>;
const Stack = ({ children }: { children: ReactNode }) => <div className="grid gap-3">{children}</div>;

function Upsell({ what, tier }: { what: string; tier: string }) {
  return (
    <p className="rounded-lg border border-line bg-foreground/[0.04] px-3 py-2 text-[13px] text-muted">
      {what} : inclus avec la formule {tier}.{" "}
      <a href="/tarifs" className="text-foreground underline underline-offset-2">
        Voir les formules
      </a>
    </p>
  );
}

export default function AutoSheet({ o, rights, open, onClose }: { o: Obs; rights: Rights; open: boolean; onClose: () => void }) {
  const r = o.roles;
  const { scenes, inputNames, saveRoles, oldAgent } = o;
  const noPrises = !rights.prises;
  const noIa = rights.cams === 0;
  const autoOn = !!r && (r.enabled || !!r.autoEnabled);
  const autoIncomplete = !!r && !r.enabled && !r.autoEnabled && !(r.liveScene && r.scene && r.source) && !(r.droneSource && r.droneScene && r.liveScene);
  const provider: Provider = r?.directorProvider ?? "none";
  const secoursReady = !!(r?.source && r?.scene && r?.liveScene);
  const droneReady = !!(r?.droneSource && r?.droneScene && r?.liveScene);
  const audioReady = !!(r?.audioSource && r?.liveScene);
  const readyCams = (r?.directorCams ?? []).filter((c) => c.source && c.scene);
  const setCam = (i: number, patch: Partial<NonNullable<Roles["directorCams"]>[number]>) => saveRoles({ directorCams: (r?.directorCams ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) });
  const setRule = (i: number, patch: Partial<NonNullable<Roles["autoRules"]>[number]>) => saveRoles({ autoRules: (r?.autoRules ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <Sheet open={open} onClose={onClose} title="Régie automatique" size="md">
      {!r ? (
        <p className="text-sm text-muted">Lecture des réglages de la régie…</p>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-foreground/[0.04] p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{autoOn ? "Régie automatique activée" : "Régie automatique éteinte"}</p>
              <p className="mt-0.5 text-[13px] text-muted">{autoOn ? "SYXTEE surveille ton direct : secours et drone se gèrent tout seuls." : "Un clic : SYXTEE repère tes scènes (Live, secours, drone) et s'occupe du reste."}</p>
            </div>
            <button type="button" onClick={() => (autoOn ? saveRoles({ enabled: false, autoEnabled: false }) : o.enableAuto())} className={autoOn ? btn() : btnPrimary()}>
              {autoOn ? "Désactiver" : "Activer en un clic"}
            </button>
          </div>
          <Note>La régie change de scène à ta place quand il le faut, mais seulement quand ta scène Live est à l&apos;antenne. Étape 1 : choisis ta scène Live. Étape 2 : active ce que tu veux ci-dessous.</Note>
          {autoIncomplete && <Note tone="warn">On n&apos;a pas tout trouvé : choisis les scènes ci-dessous (elles sont marquées « À compléter »), puis réactive.</Note>}
          {oldAgent && (
            <p role="alert" className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[13px] text-warn">
              Ton SYXTEE Link est en version {o.agent.version}. « Autres prises », « Garde audio » et « Régie IA » demandent la version 0.7.0 : mets-le à jour pour les utiliser.
            </p>
          )}
          {r.state === "drone" && <p className="rounded-lg border border-line px-3 py-2 text-[13px] text-ok">En ce moment : belle prise du drone à l&apos;antenne.</p>}
          {r.state === "backup" && <p className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[13px] text-warn">En ce moment : scène de secours à l&apos;antenne (connexion coupée).</p>}

          <section className="rounded-xl border border-line px-4 py-3.5">
            <h3 className="text-sm font-semibold">1. Ta scène Live</h3>
            <p className="mb-3 mt-0.5 text-[13px] leading-relaxed text-muted">
              C&apos;est la scène que tu mets à l&apos;antenne pour diffuser. Tant qu&apos;elle n&apos;est pas en direct, la régie ne touche à rien.
            </p>
            <Select label="La scène que tu mets en direct" value={r.liveScene} options={scenes} onChange={(v) => saveRoles({ liveScene: v })} />
            <div className="mt-1 border-t border-line">
              <Row title="Faible latence des flux (avancé)" text="Reconnexion en 1 s et petit tampon : les flux restent ouverts, sans coupure dans le Multiview d'OBS quand tu changes de scène.">
                <Switch label="Faible latence des flux" on={r.lowLatency !== false} disabled={oldAgent} onClick={() => saveRoles({ lowLatency: r.lowLatency === false })} />
              </Row>
            </div>
          </section>

          <Disclosure title="2a. Secours si ta connexion coupe" summary="Si l'image se fige, SYXTEE passe sur ta scène de secours, puis revient seul." status={<Status on={r.enabled} todo={!secoursReady} />}>
            <Stack>
              <Select label="Scène de secours" value={r.scene} options={scenes} onChange={(v) => saveRoles({ scene: v })} />
              <Row title="Activer le secours automatique" text={r.enabled ? "Actif : le secours s'affiche si l'image se fige, puis tu reviens sur Live quand elle repart." : "Éteint."}>
                <Switch label="Activer le secours automatique" on={r.enabled} disabled={!r.source || !r.scene || !r.liveScene} onClick={() => saveRoles({ enabled: !r.enabled })} />
              </Row>
              {!secoursReady && <Note tone="warn">Il manque {[!r.liveScene && "ta scène Live", !r.scene && "ta scène de secours", !r.source && "le flux (touche « Corriger » dans la barre du haut)"].filter(Boolean).join(", ")}.</Note>}
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Quand passer sur le secours ?</legend>
                <div className="grid gap-2">
                  {TRIGGERS.map((t) => (
                    <label key={t.id} className={cx("flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors", r.trigger === t.id ? "border-foreground/50 bg-foreground/[0.05]" : "border-line hover:border-line-strong")}>
                      <input type="radio" name="trigger" checked={r.trigger === t.id} onChange={() => saveRoles({ trigger: t.id })} className="mt-1 size-4 accent-[var(--foreground)]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{t.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{t.text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </Stack>
          </Disclosure>

          <Disclosure title="2b. Drone et autres caméras" summary="Quand une caméra envoie une belle image, SYXTEE passe dessus tout seul." status={<Status on={!!r.autoEnabled} todo={!droneReady} />}>
            <Stack>
              <Note>Dès que le drone envoie une belle image (qui bouge, pas noire), SYXTEE passe dessus, puis revient sur ta scène Live quand la prise s&apos;arrête. Si tu changes de scène à la main, la régie attend 30 secondes avant de reprendre.</Note>
              <Select label="Source du drone" value={r.droneSource ?? ""} options={inputNames} onChange={(v) => saveRoles({ droneSource: v })} />
              <Select label="Scène du drone" value={r.droneScene ?? ""} options={scenes} onChange={(v) => saveRoles({ droneScene: v })} />
              <Row title="Passer sur le drone automatiquement" text={r.autoEnabled ? "Actif : SYXTEE surveille le drone." : "Éteint."}>
                <Switch label="Passer sur le drone automatiquement" on={!!r.autoEnabled} disabled={noPrises || !r.droneSource || !r.droneScene || !r.liveScene} onClick={() => saveRoles({ autoEnabled: !r.autoEnabled })} />
              </Row>
              {noPrises && <Upsell what="L'auto-gérance du drone et les autres prises" tier="Signature" />}
              <h4 className="mt-1 text-sm font-semibold">Autres caméras</h4>
              <Note>Même principe pour une autre caméra, un écran ou un invité. Le drone est prioritaire, puis la liste dans l&apos;ordre.</Note>
              {(r.autoRules ?? []).map((x, i) => (
                <div key={i} className="grid gap-2.5 rounded-lg border border-line p-3">
                  <Select label={`Source ${i + 1}`} value={x.source} options={inputNames} onChange={(v) => setRule(i, { source: v })} />
                  <Select label={`Scène ${i + 1}`} value={x.scene} options={scenes} onChange={(v) => setRule(i, { scene: v })} />
                  <button type="button" onClick={() => saveRoles({ autoRules: (r.autoRules ?? []).filter((_, j) => j !== i) })} className={cx(btn("sm"), "justify-self-start")}>
                    Retirer
                  </button>
                </div>
              ))}
              {(r.autoRules ?? []).some((x) => !x.source || !x.scene) && <Note tone="warn">Une caméra sans source ou sans scène est ignorée.</Note>}
              {(r.autoRules ?? []).length < 8 && (
                <button type="button" disabled={oldAgent || noPrises} onClick={() => saveRoles({ autoRules: [...(r.autoRules ?? []), { source: "", scene: "" }] })} className={cx(btn(), "justify-self-start")}>
                  Ajouter une caméra
                </button>
              )}
            </Stack>
          </Disclosure>

          <Disclosure title="2c. Alerte micro" summary="Si ton micro se tait ou est coupé, tu es prévenu (et il peut être remis tout seul)." status={<Status on={!!r.audioEnabled} todo={!audioReady} />}>
            <Stack>
              <Select label="Micro à surveiller" value={r.audioSource ?? ""} options={inputNames} onChange={(v) => saveRoles({ audioSource: v })} />
              <Row title="Me prévenir quand le micro se tait" text={r.audioEnabled ? `Actif : alerte après ${r.audioSeconds ?? 10} s sans son.` : "Éteint."}>
                <Switch label="Me prévenir quand le micro se tait" on={!!r.audioEnabled} disabled={oldAgent || !r.audioSource || !r.liveScene} onClick={() => saveRoles({ audioEnabled: !r.audioEnabled })} />
              </Row>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Délai avant l&apos;alerte</span>
                <select disabled={oldAgent} value={r.audioSeconds ?? 10} onChange={(e) => saveRoles({ audioSeconds: Number(e.target.value) })} className={cx(field, "!w-auto")}>
                  {[5, 10, 20, 30, 60].map((n) => (
                    <option key={n} value={n}>
                      {n} secondes
                    </option>
                  ))}
                </select>
              </label>
              <Row title="Remettre le micro tout seul" text="S'il est coupé par erreur pendant ta scène Live.">
                <Switch label="Remettre le micro" on={!!r.audioUnmute} disabled={oldAgent || !r.audioSource} onClick={() => saveRoles({ audioUnmute: !r.audioUnmute })} />
              </Row>
              <Row title="Secours quand le micro est muet" text="Affiche ta scène de secours tant que le micro est muet, puis revient sur Live quand le son repart.">
                <Switch label="Secours quand le micro est muet" on={!!r.audioBackup} disabled={oldAgent || !r.audioSource || !r.scene} onClick={() => saveRoles({ audioBackup: !r.audioBackup })} />
              </Row>
              {!r.scene && <Note>Choisis d&apos;abord ta scène de secours.</Note>}
            </Stack>
          </Disclosure>

          <Disclosure title="2d. Régie IA (plusieurs caméras)" summary="Une IA choisit la caméra où il se passe quelque chose." status={<Status on={!!r.directorEnabled} todo={readyCams.length < 2 || !r.liveScene} />}>
            <Stack>
              {noIa && <Upsell what="La régie IA" tier="Signature" />}
              {!noIa && rights.cams < 6 && <Note>Ta formule permet jusqu&apos;à {rights.cams} caméras (6 avec Prestige).</Note>}
              <Note>
                Pour 2 caméras ou plus (Osmo, iPhone, drone, téléphones en SRTLA). Toutes les quelques secondes, une IA regarde chaque caméra et met au programme celle où il se passe quelque chose, selon tes consignes. Une caméra coupée ou figée n&apos;est jamais choisie. Chaque caméra a sa propre scène OBS : choisis la source, puis « Créer la scène » si elle n&apos;existe pas encore.
              </Note>
              {(r.directorCams ?? []).map((c, i) => (
                <div key={i} className="grid gap-2.5 rounded-lg border border-line p-3">
                  <Draft label="Rôle (lu par l'IA)" value={c.label} maxLength={80} placeholder="ex. Osmo à la main" disabled={oldAgent} onCommit={(v) => setCam(i, { label: v })} />
                  <Select label={`Source caméra ${i + 1}`} value={c.source} options={inputNames} onChange={(v) => setCam(i, { source: v })} />
                  <Select label={`Scène caméra ${i + 1}`} value={c.scene} options={scenes} onChange={(v) => setCam(i, { scene: v })} />
                  <div className="flex flex-wrap gap-2">
                    {c.source && !c.scene && (
                      <button type="button" onClick={() => void o.createCamScene(i)} className={btn("sm")}>
                        Créer la scène « {o.camSceneName(c)} »
                      </button>
                    )}
                    <button type="button" onClick={() => saveRoles({ directorCams: (r.directorCams ?? []).filter((_, j) => j !== i) })} className={btn("sm")}>
                      Retirer
                    </button>
                  </div>
                </div>
              ))}
              {(r.directorCams ?? []).length < rights.cams && (
                <button type="button" disabled={oldAgent} onClick={() => saveRoles({ directorCams: [...(r.directorCams ?? []), { source: "", scene: "", label: "" }] })} className={cx(btn(), "justify-self-start")}>
                  Ajouter une caméra
                </button>
              )}
              <Draft label="Consignes (en français, comme à un réalisateur)" value={r.directorRules ?? ""} multiline rows={4} maxLength={1000} disabled={oldAgent} onCommit={(v) => saveRoles({ directorRules: v })} />
              <label className="grid gap-1 text-[13px] text-muted">
                IA utilisée
                <select disabled={oldAgent} value={provider} onChange={(e) => saveRoles({ directorProvider: e.target.value as Provider })} className={field}>
                  <option value="none">Sans IA (gratuit, aucun calcul)</option>
                  <option value="local">Sur ton PC (gratuit, rien ne sort)</option>
                  <option value="mistral">Mistral (offre gratuite)</option>
                  <option value="anthropic">Claude d&apos;Anthropic (payant)</option>
                </select>
              </label>
              {provider === "none" ? (
                <Note>Sans IA : la régie ne choisit pas la caméra toute seule. Elle reprend sur une caméra vivante dès que celle à l&apos;antenne se fige ou se coupe. Rien n&apos;est envoyé, aucun calcul n&apos;est ajouté sur ton PC.</Note>
              ) : provider === "local" ? (
                <>
                  <Draft label="Modèle Ollama (vide : gemma3:4b)" value={r.directorModel ?? ""} maxLength={80} placeholder="gemma3:4b" disabled={oldAgent} onCommit={(v) => saveRoles({ directorModel: v.trim() })} mono />
                  <Note>Installe Ollama (ollama.com) sur le PC d&apos;OBS, puis lance « ollama pull gemma3:4b » dans un terminal (environ 3 Go). Aucune clé, aucun envoi : l&apos;IA tourne sur ce PC.</Note>
                </>
              ) : (
                <>
                  <label className="grid gap-1 text-[13px] text-muted">
                    Clé API {provider === "mistral" ? "Mistral" : "Anthropic"}, facultative {r.directorKeySet ? "(enregistrée sur ce PC)" : "(enregistrée seulement sur ton PC)"}
                    <input
                      disabled={oldAgent}
                      type="password"
                      autoComplete="off"
                      placeholder={r.directorKeySet ? "••••••••  (laisser vide pour garder)" : provider === "anthropic" ? "sk-ant-…" : "Clé de console.mistral.ai"}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          saveRoles({ directorKey: e.target.value.trim() });
                          e.target.value = "";
                        }
                      }}
                      className={cx(field, "font-mono")}
                    />
                  </label>
                  {r.directorKeySet && (
                    <button type="button" onClick={() => saveRoles({ directorClearKey: true })} className={cx(btn("sm"), "justify-self-start")}>
                      Effacer la clé
                    </button>
                  )}
                  {provider === "anthropic" && <Draft label="Identifiant d'espace de travail Anthropic (seulement si ta clé n'est pas rattachée à un espace)" value={r.directorWorkspaceId ?? ""} maxLength={100} placeholder="wrkspc_…" disabled={oldAgent} onCommit={(v) => saveRoles({ directorWorkspaceId: v.trim() })} mono />}
                  <Note>
                    {r.directorKeySet ? "Avec ta clé API, l'IA choisit la caméra selon tes consignes." : "Sans clé API (gratuit) : la régie reprend sur une caméra vivante dès que celle à l'antenne tombe. Ajoute une clé pour que l'IA choisisse selon tes consignes."} Chaque analyse envoie de petites vignettes de tes caméras à {provider === "mistral" ? "Mistral (offre gratuite d'expérimentation sur console.mistral.ai, avec des limites de débit)" : "Anthropic (facturé par appel)"} avec ta clé (un appel toutes les {r.directorInterval ?? 4} s en direct). Désactive la régie IA pour ne rien envoyer.
                  </Note>
                </>
              )}
              {provider === "local" && <Note>Rien n&apos;est envoyé hors du PC : les vignettes de tes caméras sont analysées en local par Ollama.</Note>}
              <Row title="Mode économe" text="Petites vignettes, et l'IA n'est consultée que si les images ont changé (ou toutes les 30 s). Moins de calcul sur le PC, moins d'appels.">
                <Switch label="Mode économe" on={r.directorEco !== false} disabled={oldAgent} onClick={() => saveRoles({ directorEco: r.directorEco === false })} />
              </Row>
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <label className="grid gap-1 text-[13px] text-muted">
                  Analyse toutes les
                  <select disabled={oldAgent} value={r.directorInterval ?? 4} onChange={(e) => saveRoles({ directorInterval: Number(e.target.value) })} className={field}>
                    {[2, 4, 6, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} s
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[13px] text-muted">
                  Garde au moins
                  <select disabled={oldAgent} value={r.directorHold ?? 6} onChange={(e) => saveRoles({ directorHold: Number(e.target.value) })} className={field}>
                    {[3, 6, 10, 20].map((n) => (
                      <option key={n} value={n}>
                        {n} s
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <Row
                title="Régie IA"
                text={r.directorEnabled ? (r.directorState === "cam" && r.directorCam != null && r.directorCam >= 0 ? `Active : « ${readyCams[r.directorCam]?.label || `caméra ${r.directorCam + 1}`} » au programme.` : "Active : elle regarde tes caméras.") : "Éteinte."}
              >
                <Switch label="Régie IA" on={!!r.directorEnabled} disabled={oldAgent || noIa || !r.liveScene || readyCams.length < 2} onClick={() => saveRoles({ directorEnabled: !r.directorEnabled })} />
              </Row>
              {r.directorEnabled && r.directorState === "error" && (
                <p role="alert" className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[13px] text-warn">
                  La régie IA n&apos;arrive pas à joindre l&apos;IA : {r.directorReason || "erreur inconnue"}
                </p>
              )}
              {readyCams.length < 2 && <Note>Il faut ta scène Live et au moins 2 caméras complètes (source et scène).</Note>}
            </Stack>
          </Disclosure>
        </div>
      )}
    </Sheet>
  );
}
