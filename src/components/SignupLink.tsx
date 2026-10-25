"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { useAccount } from "@/components/AccountMenu";

// Lien d'inscription qui s'adapte au visiteur : connecté → « Mon espace », déjà venu avec un compte (drapeau local posé à la connexion) → « Connexion », sinon « Créer mon compte ».
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
const known = () => {
  try { return localStorage.getItem("syx-member") === "1"; } catch { return false; }
};

export default function SignupLink({ className, children }: { className?: string; children: ReactNode }) {
  const account = useAccount();
  const member = useSyncExternalStore(subscribe, known, () => false);
  if (account) return <Link href="/dashboard" className={className}>Mon espace</Link>;
  if (account === null && member) return <Link href="/connexion" className={className}>Connexion</Link>;
  return <Link href="/inscription" className={className}>{children}</Link>;
}
