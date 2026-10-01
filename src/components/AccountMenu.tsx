"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { initials, shortName } from "@/lib/names";
import { effectivePlan, type Feature } from "@/lib/plans";
import { hasSupabase } from "@/lib/supabase/env";
import { SupportId } from "./SupportId";

// Nav : « Connexion » pour les visiteurs, avatar rond + menu (Dashboard, Mon compte, Déconnexion) une fois connecté.
// Lecture côté navigateur : les pages publiques restent statiques.

/** name : « Mathis N. » (ou l'email tant que le prénom n'est pas renseigné). */
export type Account = { name: string; initials: string; avatar: string | null; supportId: string | null; planName: string; features: Feature[] } | null;

export function useAccount() {
  const [account, setAccount] = useState<Account | undefined>(hasSupabase ? undefined : null);
  useEffect(() => {
    if (!hasSupabase) return;
    const supabase = createClient();
    let alive = true;
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (alive) setAccount(null);
        return;
      }
      const { data: p } = await supabase.from("profiles").select("first_name, last_name, avatar_url, support_id, plan, plan_until, suspended_at").eq("id", user.id).single();
      const name = shortName(p, user.email ?? "?");
      // Affichage seulement (cadenas, nom de formule) : les droits sont revérifiés côté serveur.
      const plan = p?.suspended_at ? effectivePlan(null) : effectivePlan(p);
      if (alive) setAccount({ name, initials: initials(p, name), avatar: p?.avatar_url ?? null, supportId: p?.support_id ?? null, planName: plan.name, features: plan.features });
    };
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return account;
}

export function Avatar({ account, size = 32 }: { account: NonNullable<Account>; size?: number }) {
  return account.avatar ? (
    <Image src={account.avatar} alt="" width={size} height={size} className="rounded-full border border-accent/25 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full border border-accent/25 bg-accent/[0.12] font-mono text-[11px] uppercase" style={{ width: size, height: size }}>
      {account.initials}
    </span>
  );
}

export type MenuLink = { label: string; href: string; external?: boolean };
/** Groupe d'entrées du panneau (libellé mono facultatif). */
export type MenuGroup = { label?: string; links: MenuLink[] };
/** Entrées du menu sur le site. Le dashboard passe ses groupes (Compte, Admin, Aide). */
export const siteAccountLinks: MenuLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Mon compte", href: "/compte" },
];

export function MenuLinkItem({ link, className, onNavigate }: { link: MenuLink; className: string; onNavigate?: () => void }) {
  return link.external ? (
    <a role="menuitem" href={link.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>
      {link.label}
      <span aria-hidden="true" className="ml-1.5 text-muted">↗</span>
    </a>
  ) : (
    <Link role="menuitem" href={link.href} onClick={onNavigate} className={className}>
      {link.label}
    </Link>
  );
}

const itemCls = "block w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-accent/10 hover:text-foreground";

export default function AccountMenu({ account, groups = [{ links: siteAccountLinks }] }: { account: Account | undefined; groups?: MenuGroup[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (account === undefined) return <span className="block h-8 w-8" aria-hidden="true" />;
  if (account === null)
    return (
      <Link href="/connexion" className="whitespace-nowrap text-sm text-muted transition-colors hover:text-foreground">
        Connexion
      </Link>
    );

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Menu du compte ${account.name}`}
        className="flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <Avatar account={account} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-background p-2 shadow-[0_24px_60px_-12px_var(--shadow-pop)]"
        >
          {/* Qui est connecté : avatar, nom, formule, ID support */}
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar account={account} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">Formule {account.planName}</p>
            </div>
          </div>
          {account.supportId && (
            <div className="border-b border-line px-3 pb-3">
              <SupportId id={account.supportId} compact />
            </div>
          )}
          {groups.map((g, i) => (
            <div key={g.label ?? i} className="border-b border-line py-2">
              {g.label && <p className="px-3 pb-1 pt-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{g.label}</p>}
              {g.links.map((l) => (
                <MenuLinkItem key={l.href} link={l} onNavigate={() => setOpen(false)} className={itemCls} />
              ))}
            </div>
          ))}
          <form action={signOut} className="pt-2">
            <button role="menuitem" type="submit" className={itemCls}>
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
