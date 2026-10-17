"use client";

import { useEffect } from "react";

// Anti double-clic global : un formulaire déjà envoyé ignore tout nouvel envoi pendant 2 s, et ses boutons d'envoi
// se grisent le temps du délai. Couvre les boutons « simples » (<button type="submit">) qui n'ont pas d'état d'attente propre.
// Les formulaires GET (recherche, filtres) ne sont pas concernés.
const LOCK_MS = 2000;

export default function SubmitLock() {
  useEffect(() => {
    const locked = new WeakSet<HTMLFormElement>();
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target instanceof HTMLFormElement ? e.target : null;
      // Les formulaires d'action serveur n'ont pas d'attribut method (le DOM répondrait « get ») : seul un method="get" écrit explicitement est ignoré.
      if (!form || form.getAttribute("method")?.toLowerCase() === "get") return;
      if (locked.has(form)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }
      // Après les autres gestionnaires (React, confirmation) : on voit alors si l'envoi a été annulé.
      locked.add(form);
      setTimeout(() => {
        if (e.defaultPrevented) {
          locked.delete(form);
          return;
        }
        const buttons = [...form.querySelectorAll<HTMLButtonElement>('button[type="submit"]:not(:disabled)')];
        buttons.forEach((b) => (b.disabled = true));
        setTimeout(() => {
          locked.delete(form);
          buttons.forEach((b) => (b.disabled = false));
        }, LOCK_MS);
      }, 0);
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);
  return null;
}
