"use client";

import Link from "next/link";
import SignupLink from "@/components/SignupLink";
import { usePathname } from "next/navigation";

// Téléphone : barre d'action collée en bas du site public (« Créer mon compte » toujours à portée de pouce). Cachée sur grand écran
// et sur les pages où l'action est déjà à l'écran.
const HIDDEN = ["/acces", "/inscription", "/tarifs", "/application"];

export default function MobileCta() {
  const path = usePathname();
  if (HIDDEN.includes(path)) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] glass-bar sm:hidden">
      <div className="mx-auto flex max-w-md gap-3">
        <SignupLink className="btn btn-primary flex-1">Créer mon compte</SignupLink>
        <Link href="/tarifs" className="btn btn-secondary">
          Tarifs
        </Link>
      </div>
    </div>
  );
}
