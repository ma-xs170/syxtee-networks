"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { hasSupabase } from "@/lib/supabase/env";
import { SupportId } from "./SupportId";

// Nav : « Connexion » pour les visiteurs, avatar rond + menu (Dashboard, Mon compte, Déconnexion) une fois connecté.
// Lecture côté navigateur : les pages publiques restent statiques.

export type Account = { username: string; avatar: string | null; supportId: string | null } | null;

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
      const { data: p } = await supabase.from("profiles").select("username, avatar_url, support_id").eq("id", user.id).single();
      if (alive) setAccount({ username: p?.username ?? user.email ?? "?", avatar: p?.avatar_url ?? null, supportId: p?.support_id ?? null });
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
    <Image src={account.avatar} alt="" width={size} height={size} className="rounded-full border border-white/15 object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex items-center justify-center rounded-full border border-white/15 bg-white/[0.06] font-mono text-xs uppercase" style={{ width: size, height: size }}>
      {account.username.charAt(0)}
    </span>
  );
}

export type MenuLink = { label: string; href: string };
/** Entrées du menu sur le site. Le dashboard passe les siennes (Profil, Abonnement, Documentation). */
export const siteAccountLinks: MenuLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Mon compte", href: "/compte" },
];

const itemCls = "block w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground";

export default function AccountMenu({ account, links = siteAccountLinks }: { account: Account | undefined; links?: MenuLink[] }) {
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
        aria-label={`Menu du compte ${account.username}`}
        className="flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <Avatar account={account} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-3 w-64 rounded-xl border border-line bg-black/95 p-1.5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md">
          <p className="truncate px-3 pb-2 pt-1.5 font-mono text-xs text-muted">@{account.username}</p>
          {account.supportId && (
            <div className="mb-1 border-b border-line px-3 pb-2">
              <SupportId id={account.supportId} compact />
            </div>
          )}
          {links.map((l) => (
            <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)} className={itemCls}>
              {l.label}
            </Link>
          ))}
          <form action={signOut}>
            <button role="menuitem" type="submit" className={itemCls}>
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
