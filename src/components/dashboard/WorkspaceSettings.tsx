"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteWorkspaceAction, renameWorkspaceAction } from "@/app/(dashboard)/dashboard/espaces/actions";

// Réglages d'un espace partagé : le renommer (propriétaire et administrateurs) ou le supprimer (propriétaire, en retapant son nom).

const field = "h-11 w-full rounded-lg border border-line bg-background px-3 text-sm text-foreground placeholder:text-muted focus:border-foreground/60 focus:outline-none";

export default function WorkspaceSettings({ id, name, role }: { id: string; name: string; role: "owner" | "admin" | "member" }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [confirm, setConfirm] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  if (role === "member") return null;

  function rename(e: React.FormEvent) {
    e.preventDefault();
    setMsg({});
    start(async () => {
      const r = await renameWorkspaceAction({ id, name: value });
      setMsg(r.error ? { error: r.error } : { ok: "Espace renommé." });
      if (!r.error) router.refresh();
    });
  }
  function remove(e: React.FormEvent) {
    e.preventDefault();
    setMsg({});
    start(async () => {
      const r = await deleteWorkspaceAction({ id, confirm });
      if (r.error) return setMsg({ error: r.error });
      dialog.current?.close();
      router.push("/dashboard");
      router.refresh();
    });
  }
  const close = () => {
    dialog.current?.close();
    setOpen(false);
    setConfirm("");
    setMsg({});
  };

  return (
    <section id="ws-settings" aria-labelledby="ws-settings-title" className="mt-10 scroll-mt-24 tile p-5 sm:p-6">
      <h2 id="ws-settings-title" className="text-base font-semibold tracking-tight">
        Réglages de l&apos;espace
      </h2>

      <form onSubmit={rename} className="mt-4 grid max-w-xl gap-2">
        <label htmlFor="ws-name" className="text-xs text-muted">
          Nom de l&apos;espace
        </label>
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <input id="ws-name" value={value} onChange={(e) => setValue(e.target.value)} maxLength={40} required className={field} />
          <button type="submit" disabled={pending || value.trim() === name || !value.trim()} className="btn btn-secondary shrink-0 disabled:opacity-50">
            {pending && !open ? "Enregistrement…" : "Renommer"}
          </button>
        </div>
      </form>
      {msg.ok && (
        <p role="status" className="mt-3 text-sm text-foreground">
          {msg.ok}
        </p>
      )}
      {msg.error && !open && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {msg.error}
        </p>
      )}

      {role === "owner" && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-red-300">Supprimer l&apos;espace</h3>
          <p className="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-muted">
            Les flux, les OBS reliés, les sauvegardes de scènes et les membres de cet espace sont supprimés. Personne n&apos;est supprimé de SYXTEE : chaque membre garde son compte et son espace personnel. Action définitive.
          </p>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setMsg({});
              dialog.current?.showModal();
            }}
            className="btn btn-secondary mt-4 border-red-400/40 text-red-300"
          >
            Supprimer cet espace
          </button>
        </div>
      )}

      <dialog ref={dialog} onClose={close} onClick={(e) => e.target === dialog.current && close()} aria-labelledby="ws-del-title" className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-red-400/40 bg-background p-0 text-foreground backdrop:bg-black/70">
        <form onSubmit={remove} className="p-6">
          <h2 id="ws-del-title" className="text-lg font-semibold tracking-tight">
            Supprimer « {name} » ?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Cette action est définitive. Pour confirmer, retape le nom de l&apos;espace.</p>
          <label htmlFor="ws-confirm" className="mt-4 block text-xs text-muted">
            Nom de l&apos;espace
          </label>
          <input id="ws-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" placeholder={name} className={`${field} mt-1.5`} />
          {msg.error && open && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {msg.error}
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" disabled={pending || confirm.trim().toLowerCase() !== name.trim().toLowerCase()} className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-red-600 px-5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50">
              {pending ? "Suppression…" : "Supprimer pour de bon"}
            </button>
            <button type="button" onClick={close} className="btn btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
