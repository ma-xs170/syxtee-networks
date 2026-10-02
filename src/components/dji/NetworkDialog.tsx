"use client";

import { useEffect, useId, useRef, useState } from "react";
import { PasswordInput } from "@/components/auth/AuthCard";
import { newId, type Network } from "./store";

// Ajouter ou modifier un réseau Internet pour les caméras (partage de connexion du téléphone ou Wi-Fi).
// Le mot de passe reste sur ce téléphone, et seulement si « Mémoriser » est coché.

const KINDS: { id: Network["kind"]; title: string; text: string }[] = [
  { id: "hotspot", title: "Partage de connexion", text: "La 4G / 5G de ton téléphone. Le plus simple en IRL." },
  { id: "wifi", title: "Wi-Fi", text: "Une box, un routeur 4G de poche, un Wi-Fi d'événement." },
];

export const emptyNetwork = (): Network => ({ id: newId(), kind: "hotspot", ssid: "", password: "", remember: true });

export default function NetworkDialog({ open, initial, onClose, onSave }: { open: boolean; initial: Network | null; onClose: () => void; onSave: (n: Network) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [n, setN] = useState<Network>(initial ?? emptyNetwork());
  // Plusieurs fenêtres peuvent coexister (hub + assistant caméra) : identifiants uniques.
  const uid = useId();

  // Formulaire initialisé au montage : le parent change la `key` à chaque ouverture (pas de remise à zéro après coup).
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const ok = n.ssid.trim().length > 0;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${uid}-title`}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-background p-6 text-foreground backdrop:bg-background/80 sm:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id={`${uid}-title`} className="text-xl font-semibold tracking-tight">
          {initial ? "Modifier le" : "Ajouter un"} réseau
        </h2>
        <button type="button" onClick={onClose} className="h-10 rounded-full px-4 text-sm text-muted transition-colors hover:bg-accent/10 hover:text-foreground">
          Fermer
        </button>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm text-muted">Par où la caméra envoie le direct</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {KINDS.map((k) => (
            <label
              key={k.id}
              className={`flex cursor-pointer flex-col rounded-2xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60 ${n.kind === k.id ? "border-accent bg-accent/[0.08]" : "border-line hover:bg-accent/[0.08]"}`}
            >
              <input type="radio" name={`${uid}-kind`} checked={n.kind === k.id} onChange={() => setN({ ...n, kind: k.id })} className="sr-only" />
              <span className="text-sm font-medium">{k.title}</span>
              <span className="mt-1 text-xs leading-relaxed text-muted">{k.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 grid gap-5">
        <div className="space-y-2">
          <label htmlFor={`${uid}-ssid`} className="block text-sm font-medium text-foreground/80">
            Nom du réseau
          </label>
          <input
            id={`${uid}-ssid`}
            value={n.ssid}
            onChange={(e) => setN({ ...n, ssid: e.target.value })}
            autoComplete="off"
            placeholder={n.kind === "hotspot" ? "Ex. iPhone de Mathis" : "Ex. Livebox-E740"}
            className="h-12 w-full rounded-xl border border-line bg-background px-4 text-base text-foreground placeholder:text-muted focus:border-accent/70 focus:outline-none"
          />
          {n.kind === "hotspot" && <p className="text-xs text-muted">Nom affiché dans Réglages → Partage de connexion (respecte les majuscules).</p>}
        </div>
        <PasswordInput id={`${uid}-pass`} name="password" label="Mot de passe" autoComplete="new-password" value={n.password} onChange={(v) => setN({ ...n, password: v })} />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={n.remember} onChange={(e) => setN({ ...n, remember: e.target.checked })} className="mt-0.5 h-4 w-4 accent-accent" />
          <span>
            Mémoriser le mot de passe sur ce téléphone
            <span className="mt-1 block text-xs text-muted">Jamais envoyé à SYXTEE. Décoché : il te sera demandé à chaque lancement.</span>
          </span>
        </label>
      </div>

      <div className="mt-8 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="h-11 whitespace-nowrap rounded-full border border-line px-5 text-sm transition-colors hover:bg-accent/10">
          Annuler
        </button>
        <button
          type="button"
          disabled={!ok}
          onClick={() => onSave({ ...n, ssid: n.ssid.trim() })}
          className="h-11 whitespace-nowrap rounded-full bg-accent px-6 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {initial ? "Enregistrer" : "Ajouter le réseau"}
        </button>
      </div>
    </dialog>
  );
}
