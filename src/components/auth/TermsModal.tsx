"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { acceptTermsAction } from "@/app/(dashboard)/dashboard/conditions/actions";

// « Mise à jour de nos conditions » : fenêtre non fermable (ni Échap ni clic dehors) tant que les documents ne sont pas acceptés.
export default function TermsModal({ version }: { version: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const link = "text-foreground underline underline-offset-4";
  return (
    <dialog ref={ref} aria-labelledby="terms-title" onCancel={(e) => e.preventDefault()} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-6 text-foreground backdrop:bg-background/80 backdrop:backdrop-blur-sm sm:p-8">
      <h2 id="terms-title" className="text-xl font-semibold tracking-tight">Mise à jour de nos conditions</h2>
      <p className="mt-3 text-[14px] leading-relaxed text-muted">Merci de consulter les documents suivants et de les accepter pour continuer à utiliser ton espace.</p>
      <ul className="mt-5 grid gap-2 text-[15px]">
        <li><Link href="/cgu" target="_blank" className={link}>Conditions d&apos;utilisation</Link> <span className="text-muted">(version {version})</span></li>
        <li><Link href="/cgv" target="_blank" className={link}>Conditions générales de vente</Link> <span className="text-muted">(version {version})</span></li>
      </ul>
      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px]">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-[var(--dk-blue)]" />
        J&apos;ai lu et j&apos;accepte les documents ci-dessus.
      </label>
      <button type="button" disabled={!ok || pending} onClick={() => start(async () => { await acceptTermsAction(); })} className="dk-btn dk-btn-primary mt-6 w-full !h-12">
        {pending ? "Enregistrement…" : "Accepter et continuer"}
      </button>
    </dialog>
  );
}
