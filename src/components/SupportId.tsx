"use client";

import { useState } from "react";
import { site } from "@/lib/site";
import { DiscordIcon } from "./ui";

// ID support du compte (SYX-XXXX-XXXX) : bouton Copier, et « Ouvrir un ticket Discord » qui copie l'ID avant d'ouvrir
// le serveur. Le support se fait uniquement sur Discord.

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** « ID support : SYX-7K3F-92QD » + Copier. `compact` : une ligne pour le menu avatar et le pied du dashboard. */
export function SupportId({ id, compact = false }: { id: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (await copyText(id)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <div className={`flex items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <span className="font-mono uppercase tracking-[0.1em] text-muted">ID support</span>
      <span className="font-mono tabular-nums text-foreground" data-testid="support-id">
        {id}
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label="Copier l'ID support"
        className="rounded-md px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted transition-colors hover:bg-accent/10 hover:text-foreground"
      >
        <span aria-live="polite">{copied ? "Copié" : "Copier"}</span>
      </button>
    </div>
  );
}

/** Copie l'ID, le confirme, puis ouvre le Discord (le ticket se crée là-bas). */
export function DiscordTicketButton({ id, size = "md" }: { id: string; size?: "md" | "sm" }) {
  const [note, setNote] = useState<string | null>(null);
  async function open() {
    const ok = await copyText(id);
    setNote(ok ? `ID copié : colle-le dans ton ticket (${id})` : `Note ton ID pour le ticket : ${id}`);
    window.open(site.discord, "_blank", "noopener,noreferrer");
  }
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={open}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover ${size === "sm" ? "h-9 px-4" : "h-11 px-5"}`}
      >
        <DiscordIcon />
        Ouvrir un ticket Discord
      </button>
      <p aria-live="polite" className="min-h-[1.25rem] text-xs text-muted">
        {note}
      </p>
    </div>
  );
}
