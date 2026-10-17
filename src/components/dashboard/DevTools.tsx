"use client";

import { useState, useTransition } from "react";
import { createKeyAction, createWebhookAction, deleteWebhookAction, revokeKeyAction, setWebhookActiveAction, testWebhookAction } from "@/app/(dashboard)/dashboard/compte/actions";
import { DkButton, ListRow, StatusBadge, Toggle } from "./kit";

// Onglet Développeurs : clés d'API (la clé complète n'est montrée qu'à la création) et webhooks (secret affiché dans la ligne, pour vérifier la signature).

export type KeyRow = { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null };
export type HookRow = { id: string; url: string; secret: string; active: boolean; last_at: string | null; last_status: number | null };

const input = "h-10 min-w-0 flex-1 rounded-[10px] border border-line bg-transparent px-3 text-[14px] text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-foreground";
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function ApiKeys({ keys }: { keys: KeyRow[] }) {
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError("");
            const r = await createKeyAction(name);
            if (r.error) return setError(r.error);
            setFresh(r.key ?? "");
            setName("");
          });
        }}
      >
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Nom de la clé (ex. Bot Discord)" aria-label="Nom de la clé" className={input} />
        <DkButton type="submit" tone="primary" disabled={pending || !name.trim()}>Créer</DkButton>
      </form>
      {error && <p role="alert" className="mt-3 text-[14px]" style={{ color: "var(--dk-red)" }}>{error}</p>}
      {fresh && (
        <div className="mt-4 rounded-[10px] border border-line p-4">
          <p className="text-[14px] text-foreground">Copie cette clé maintenant : elle ne sera plus affichée.</p>
          <code className="dk-mono mt-2 block break-all text-[13px]" data-sensitive>{fresh}</code>
          <div className="mt-3 flex gap-2">
            <DkButton onClick={async () => { try { await navigator.clipboard.writeText(fresh); setCopied(true); } catch { setCopied(false); } }}>{copied ? "Copiée" : "Copier"}</DkButton>
            <DkButton onClick={() => { setFresh(""); setCopied(false); }}>J&apos;ai copié la clé</DkButton>
          </div>
        </div>
      )}
      <ul className="mt-4">
        {keys.length === 0 && <li className="dk-row text-muted">Aucune clé.</li>}
        {keys.map((k) => (
          <li key={k.id}>
            <ListRow
              title={k.name}
              sub={<span className="dk-mono">{k.prefix}… · créée le {day(k.created_at)} · {k.last_used_at ? `utilisée le ${day(k.last_used_at)}` : "jamais utilisée"}</span>}
              trailing={<DkButton tone="danger" className="!h-8" disabled={pending} onClick={() => { if (confirm(`Révoquer la clé « ${k.name} » ? Les appels qui l'utilisent seront refusés.`)) start(async () => { const r = await revokeKeyAction(k.id); if (r.error) setError(r.error); }); }}>Révoquer</DkButton>}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Webhooks({ hooks }: { hooks: HookRow[] }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [shown, setShown] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setError("");
            const r = await createWebhookAction(url);
            if (r.error) return setError(r.error);
            setUrl("");
          });
        }}
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoCapitalize="none" spellCheck={false} placeholder="https://exemple.fr/webhook" aria-label="Adresse du webhook" className={input} />
        <DkButton type="submit" tone="primary" disabled={pending || !url.trim()}>Ajouter</DkButton>
      </form>
      {error && <p role="alert" className="mt-3 text-[14px]" style={{ color: "var(--dk-red)" }}>{error}</p>}
      {note && <p role="status" className="mt-3 text-[14px]" style={{ color: "var(--dk-green)" }}>{note}</p>}
      <ul className="mt-4">
        {hooks.length === 0 && <li className="dk-row text-muted">Aucun webhook.</li>}
        {hooks.map((h) => (
          <li key={h.id} className="border-t border-line first:border-t-0">
            <ListRow
              title={<span className="dk-mono text-[13px]">{h.url}</span>}
              sub={h.last_at ? `Dernier envoi le ${day(h.last_at)}` : "Aucun envoi"}
              trailing={
                <span className="flex items-center gap-3">
                  {h.last_status != null && <StatusBadge tone={h.last_status >= 200 && h.last_status < 300 ? "ok" : "bad"}>{h.last_status || "échec"}</StatusBadge>}
                  <Toggle label={`Webhook ${h.url} : actif`} checked={h.active} disabled={pending} onChange={(v) => start(async () => { await setWebhookActiveAction(h.id, v); })} />
                </span>
              }
            />
            <div className="flex flex-wrap gap-2 pb-4">
              <DkButton className="!h-8" disabled={pending} onClick={() => start(async () => { setError(""); setNote(""); const r = await testWebhookAction(h.id); if (r.error) setError(r.error); else setNote("Test reçu (réponse 2xx)."); })}>Envoyer un test</DkButton>
              <DkButton className="!h-8" onClick={() => setShown(shown === h.id ? null : h.id)}>{shown === h.id ? "Masquer le secret" : "Voir le secret"}</DkButton>
              <DkButton tone="danger" className="!h-8" disabled={pending} onClick={() => { if (confirm("Supprimer ce webhook ?")) start(async () => { await deleteWebhookAction(h.id); }); }}>Supprimer</DkButton>
            </div>
            {shown === h.id && <code className="dk-mono mb-4 block break-all text-[13px]" data-sensitive>{h.secret}</code>}
          </li>
        ))}
      </ul>
    </div>
  );
}
