"use client";

import { useState, useTransition } from "react";
import { CardFooter } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { saveAlertsAction, testAlertAction } from "./actions";

export default function AlertSettings({ initial, canEdit }: { initial: { url: string; onDrop: boolean; onQuota: boolean }; canEdit: boolean }) {
  const [url, setUrl] = useState(initial.url);
  const [onDrop, setOnDrop] = useState(initial.onDrop);
  const [onQuota, setOnQuota] = useState(initial.onQuota);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  const save = () =>
    start(async () => {
      setError(null);
      const r = await saveAlertsAction({ url, onDrop, onQuota });
      if (r.error) return setError(r.error);
      toast?.("Alertes enregistrées");
    });
  const test = () =>
    start(async () => {
      setError(null);
      const r = await testAlertAction();
      if (r.error) return setError(r.error);
      toast?.("Message d'essai envoyé sur Discord");
    });

  const box = "flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-sm has-[:checked]:border-foreground/60";
  return (
    <form onSubmit={(e) => (e.preventDefault(), save())}>
      <label htmlFor="alert-url" className="text-sm font-medium">Adresse du webhook Discord</label>
      <input
        id="alert-url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={!canEdit}
        placeholder="https://discord.com/api/webhooks/…"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        data-sensitive
        className="mt-2 h-11 w-full rounded-xl border border-line bg-background px-4 font-mono text-sm focus:border-foreground/70 focus:outline-none disabled:opacity-60"
      />
      <p className="mt-2 text-xs leading-relaxed text-muted">Discord → ton serveur → Paramètres du salon → Intégrations → Webhooks → Nouveau webhook → Copier l&apos;URL. Laisse vide pour tout couper.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className={box}>
          <input type="checkbox" checked={onDrop} onChange={(e) => setOnDrop(e.target.checked)} disabled={!canEdit} className="mt-0.5 accent-current" />
          <span><span className="block font-medium">Flux perdu</span><span className="mt-1 block text-xs text-muted">Un message quand le signal disparaît plus de 20 secondes, puis quand il revient.</span></span>
        </label>
        <label className={box}>
          <input type="checkbox" checked={onQuota} onChange={(e) => setOnQuota(e.target.checked)} disabled={!canEdit} className="mt-0.5 accent-current" />
          <span><span className="block font-medium">Plafond mensuel</span><span className="mt-1 block text-xs text-muted">Un message à 80 % puis à 100 % des 50 Go du palier Gratuit.</span></span>
        </label>
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}
      <CardFooter>
        <button type="button" onClick={test} disabled={pending || !canEdit || !initial.url} className="h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-foreground/10 disabled:opacity-50">
          Envoyer un essai
        </button>
        <button type="submit" disabled={pending || !canEdit} className="h-11 whitespace-nowrap rounded-full btn-tonal px-5 text-sm font-medium disabled:opacity-60">
          {pending ? "Un instant…" : "Enregistrer"}
        </button>
      </CardFooter>
    </form>
  );
}
