"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import {
  Archive,
  CaretUpDown,
  HardDrives,
  ChatsCircle,
  ChartBar,
  List,
  Lifebuoy,
  Lock,
  Moon,
  Question,
  Radio,
  UsersThree,
  SignOut,
  SlidersHorizontal,
  SquaresFour,
  X,
  type IconProps,
} from "@/components/icons";
import { signOut } from "@/app/(auth)/actions";
import { createWorkspaceAction, switchWorkspaceAction } from "@/app/(dashboard)/dashboard/espaces/actions";
import type { Feature } from "@/lib/plans";
import { activeAlso } from "@/lib/dashboard-nav";
import { Avatar, useAccount } from "../AccountMenu";
import { ThemeRow } from "../ThemeToggle";
import Wordmark from "../Wordmark";
import GlidePill from "../ui/GlidePill";
import NotificationsBell from "./NotificationsBell";

// Barre latérale du dashboard : groupes titrés, icônes, formule et compte en bas. Sur mobile, une barre en haut
// ouvre la même navigation en tiroir. Les entrées liées à une fonction de la formule affichent un cadenas en Gratuit.

/** Espaces partagés de l'utilisateur et espace actif (null : espace personnel). `left` : espaces qu'il peut encore créer (null : illimité). `features` : droits de l'espace actif. */
export type WorkspaceInfo = { workspaces: { id: string; name: string; color: string; role: string }[]; activeId: string | null; left: number | null; features: Feature[] | null };
const WsCtx = createContext<WorkspaceInfo>({ workspaces: [], activeId: null, left: 0, features: null });

type Item = { sharedOnly?: boolean; label: string; href: string; icon: ComponentType<IconProps>; feature?: Feature; external?: boolean; wordmark?: string; /** « À venir » : pas encore ouvert (l'admin y accède quand même). */ soon?: boolean };
type Group = { title?: string; items: Item[] };

// Barre minimale (comme un espace client de service) : Accueil, trois groupes, puis aide, thème et compte en bas.
const GROUPS: Group[] = [
  { items: [{ label: "Accueil", href: "/dashboard", icon: SquaresFour }] },
  {
    title: "Direct",
    items: [
      { label: "Flux", href: "/dashboard/relais", icon: Radio, feature: "relais" },
      { label: "Contrôle à distance", href: "/dashboard/controle-a-distance", icon: SlidersHorizontal, feature: "relais" },
      { label: "Membres", href: "/dashboard/invitations", icon: UsersThree, feature: "relais" },
      { label: "Multichat", href: "/dashboard/multichat", icon: ChatsCircle },
      { label: "Encodeurs", href: "/dashboard/encodeurs", icon: HardDrives },
    ],
  },
  {
    title: "Contenu",
    items: [{ label: "Sauvegardes de scènes", href: "/dashboard/backups", icon: Archive, feature: "relais" }],
  },
  {
    title: "Mon espace",
    items: [
      { label: "Statistiques", href: "/dashboard/stats", icon: ChartBar },
    ],
  },
];

const HELP: Item[] = [
  { label: "Support", href: "/dashboard/support", icon: Lifebuoy },
  { label: "Documentation", href: "/docs", icon: Question },
];

function NavLink({ item, active, locked, soon, onNavigate, hovered, onHover }: { item: Item; active: boolean; locked?: boolean; soon?: boolean; onNavigate: () => void; hovered?: boolean; onHover?: () => void }) {
  const Icon = item.icon;
  if (soon)
    return (
      <div aria-disabled="true" className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-muted lg:py-1.5">
        {item.wordmark ? (
          <span className="min-w-0 opacity-70" aria-label={item.label}>
            <Wordmark name={item.wordmark} size="sm" className="gap-2" />
          </span>
        ) : (
          <>
            <Icon size={20} className="shrink-0" aria-hidden="true" />
            <span className="truncate">{item.label}</span>
          </>
        )}
        <span className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em]">À venir</span>
      </div>
    );
  const cls = `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:py-2 ${
    active ? "bg-foreground/[0.07] text-foreground" : "text-muted hover:text-foreground"
  }`;
  const inner = (
    <>
      <GlidePill show={!!hovered && !active} id="dash-nav-pill" />
      
      {item.wordmark ? (
        <span className="relative z-10 min-w-0" aria-label={item.label}>
          <Wordmark name={item.wordmark} size="sm" className="gap-2" />
        </span>
      ) : (
        <>
          <Icon size={20} weight={active ? "fill" : "regular"} className="relative z-10 shrink-0" aria-hidden="true" />
          <span className="relative z-10 truncate">{item.label}</span>
        </>
      )}
      {locked && <Lock size={14} className="relative z-10 ml-auto shrink-0 text-muted" aria-label="Verrouillé dans ta formule" />}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={onNavigate} onMouseEnter={onHover} onFocus={onHover}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} prefetch aria-current={active ? "page" : undefined} className={cls} onClick={onNavigate} onMouseEnter={onHover} onFocus={onHover}>
      {inner}
    </Link>
  );
}

function AccountFooter({ account, admin, onNavigate }: { account: NonNullable<ReturnType<typeof useAccount>>; admin: boolean; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const ws = useContext(WsCtx);
  const active = ws.workspaces.find((w) => w.id === ws.activeId) ?? null;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (creating && !d.open) d.showModal();
    if (!creating && d.open) d.close();
  }, [creating]);

  const item = "block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/10";
  const row = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-foreground/10";
  function go(id: string | null) {
    setOpen(false);
    if (id === ws.activeId) return;
    start(async () => {
      await switchWorkspaceAction(id);
      onNavigate();
      router.push("/dashboard");
      router.refresh();
    });
  }
  function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    start(async () => {
      const r = await createWorkspaceAction({ name });
      if (r.error) return setError(r.error);
      setName("");
      setCreating(false);
      onNavigate();
      router.push("/dashboard");
      router.refresh();
    });
  }
  const none = ws.left !== null && ws.left <= 0;

  return (
    <div className="flex items-center gap-1">
      <div ref={box} className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2 p-2 text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        >
          <Avatar account={account} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{account.name}</span>
            <span className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ background: active?.color ?? "#40c090" }} />
              <span className="truncate">{active ? active.name : "Personnel"}</span>
            </span>
          </span>
          <CaretUpDown size={16} className="shrink-0 text-muted" aria-hidden="true" />
        </button>
        {open && (
          <div role="menu" className="absolute left-0 top-full z-50 mt-2 w-[calc(100%+3rem)] overflow-hidden rounded-2xl border border-line bg-background py-1 shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
            <p className="px-4 pb-1 pt-2.5 text-[13px] text-muted">Espace de travail</p>
            <button type="button" role="menuitemradio" aria-checked={!active} onClick={() => go(null)} className={row}>
              <span aria-hidden="true" className="grid size-2 shrink-0 place-items-center"><span className={`size-1.5 rounded-full ${active ? "" : "bg-foreground"}`} /></span>
              <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-[#40c090]" />
              <span className="min-w-0 flex-1 truncate">Mon espace</span>
              {!active && <span className="shrink-0 rounded-full border border-emerald-700/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Personnel</span>}
            </button>
            {ws.workspaces.map((w) => (
              <button key={w.id} type="button" role="menuitemradio" aria-checked={w.id === ws.activeId} onClick={() => go(w.id)} className={row}>
                <span aria-hidden="true" className="grid size-2 shrink-0 place-items-center"><span className={`size-1.5 rounded-full ${w.id === ws.activeId ? "bg-foreground" : ""}`} /></span>
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: w.color }} />
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                {w.id === ws.activeId && <span className="shrink-0 rounded-full border border-blue-700/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Partagé</span>}
              </button>
            ))}
            <button type="button" role="menuitem" disabled={none && ws.left === 0 && false} onClick={() => { setOpen(false); setCreating(true); }} className={row}>
              <span aria-hidden="true" className="grid size-2 shrink-0 place-items-center text-muted">+</span>
              <span className="min-w-0 flex-1">Créer un espace partagé</span>
              <span className="shrink-0 text-[13px] text-muted">{ws.left === null ? "illimité" : ws.left > 0 ? `${ws.left} restante${ws.left > 1 ? "s" : ""}` : "non inclus"}</span>
            </button>
            {active && active.role !== "member" && (
              <Link role="menuitem" href="/dashboard/invitations#ws-settings" onClick={() => { setOpen(false); onNavigate(); }} className={row}>
                <span aria-hidden="true" className="grid size-2 shrink-0 place-items-center text-muted">⚙</span>
                <span className="min-w-0 flex-1 truncate">Renommer ou supprimer « {active.name} »</span>
              </Link>
            )}
            <div className="mt-1 border-t border-line">
              <Link role="menuitem" href="/compte" onClick={() => { setOpen(false); onNavigate(); }} className={item}>
                Mon compte
              </Link>
              <Link role="menuitem" href="/dashboard/parametres" onClick={() => { setOpen(false); onNavigate(); }} className={item}>
                Paramètres
              </Link>
              <Link role="menuitem" href="/dashboard/abonnement" onClick={() => { setOpen(false); onNavigate(); }} className={item}>
                Abonnement
              </Link>
              {admin && (
                <Link role="menuitem" href="/admin" onClick={() => { setOpen(false); onNavigate(); }} className={item}>
                  Administration
                </Link>
              )}
            </div>
            <form action={signOut} className="border-t border-line">
              <button type="submit" role="menuitem" className={`${item} flex items-center gap-2 text-red-400`}>
                <SignOut size={16} aria-hidden="true" />
                Se déconnecter
              </button>
            </form>
          </div>
        )}
      </div>
      <NotificationsBell />

      <dialog ref={dialog} onClose={() => setCreating(false)} onClick={(e) => e.target === dialog.current && setCreating(false)} aria-labelledby="ws-title" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-background p-0 text-foreground backdrop:bg-black/70">
        <form onSubmit={create} className="p-6">
          <h2 id="ws-title" className="text-xl font-semibold tracking-tight">Créer un espace partagé</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">Pour les régies et les équipes : plusieurs OBS connectés, des membres avec leur propre compte et leur rôle, tout contrôlé au même endroit. Séparé de ton espace personnel.</p>
          <label className="mt-5 grid gap-1.5 text-sm">
            Nom de l&apos;espace
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required placeholder="Ma chaîne, Mon équipe…" className="h-11 rounded-lg border border-line bg-background px-3 text-sm placeholder:text-muted focus:border-foreground/60 focus:outline-none" />
          </label>
          {none && <p className="mt-3 text-[13px] text-muted">Ta formule n&apos;inclut pas (ou plus) d&apos;espaces partagés.</p>}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="mt-5 flex gap-2">
            <button type="submit" disabled={pending || none} className="btn btn-primary disabled:opacity-60">
              {pending ? "Création…" : "Créer l'espace"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-secondary">
              Annuler
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}

function Content({ admin, onNavigate }: { admin: boolean; onNavigate: () => void }) {
  const pathname = usePathname();
  const account = useAccount();
  const isActive = (href: string) =>
    href === "/dashboard" || href === "/"
      ? pathname === href
      : [href, ...(activeAlso[href] ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
  const ws = useContext(WsCtx);
  const locked = (i: Item) => !!i.feature && !!account && !(ws.features ?? account.features).includes(i.feature);
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">{account && <AccountFooter account={account} admin={admin} onNavigate={onNavigate} />}</div>

      <nav aria-label="Navigation de l'espace client" className="flex-1 space-y-5 overflow-y-auto px-3 py-4" onMouseLeave={() => setHover(null)}>
        {GROUPS.map((g, i) => (
          <div key={g.title ?? i}>
            {g.title && <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.filter((it) => !it.sharedOnly || ws.activeId).map((it) => (
                <li key={it.href}>
                  <NavLink item={it} active={isActive(it.href)} locked={locked(it)} soon={it.soon && !admin} onNavigate={onNavigate} hovered={hover === it.href} onHover={() => setHover(it.href)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-line p-3">
        {HELP.map((it) => (
          <NavLink key={it.href} item={it} active={isActive(it.href)} onNavigate={onNavigate} hovered={hover === it.href} onHover={() => setHover(it.href)} />
        ))}
        <ThemeRow
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:text-foreground lg:py-1.5"
          icon={<Moon size={20} className="shrink-0" aria-hidden="true" />}
        />
      </div>
    </div>
  );
}

// Barre d'onglets du bas (mobile), dans cet ordre : Accueil, Flux, OBS, Menu (le tiroir). Chaque onglet reste actif sur les pages de sa famille :
// Flux = tes flux (SRTLA, RTMP) ; OBS = liste des postes, plugin, et l'interface d'un OBS (/controle-a-distance/<poste>).
const TABS: (Item & { also?: string[] })[] = [
  { label: "Accueil", href: "/dashboard", icon: SquaresFour },
  { label: "Flux", href: "/dashboard/relais", icon: Radio, feature: "relais" },
  { label: "OBS", href: "/dashboard/controle-a-distance", icon: SlidersHorizontal, feature: "relais", also: ["/dashboard/obs", "/dashboard/plugin", "/controle-a-distance"] },
];

function MobileTabs({ onMenu, menuOpen }: { onMenu: () => void; menuOpen: boolean }) {
  const ws = useContext(WsCtx);
  const pathname = usePathname();
  const account = useAccount();
  const cell = "relative flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] transition-colors active:scale-[0.97]";
  return (
    <nav aria-label="Navigation rapide" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 pt-1.5">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t.href === "/dashboard" ? pathname === t.href : [t.href, ...(t.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
          const locked = !!t.feature && !!account && !(ws.features ?? account.features).includes(t.feature);
          return (
            <li key={t.href}>
              <Link href={t.href} prefetch aria-current={on ? "page" : undefined} className={`${cell} ${on ? "text-foreground" : "text-muted"}`}>
                {on && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-accent" />}
                <Icon size={22} weight={on ? "fill" : "regular"} aria-hidden="true" />
                <span className="max-w-full truncate">{t.label}</span>
                {locked && <Lock size={10} className="absolute right-3 top-1.5 text-muted" aria-label="Verrouillé dans ta formule" />}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-label="Ouvrir le menu" className={`${cell} w-full text-muted`}>
            <List size={22} aria-hidden="true" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

/** Mise en page : barre latérale fixe en desktop, barre du haut et tiroir en mobile. */
export default function DashboardShell({ admin, children, workspace }: { admin: boolean; children: React.ReactNode; workspace?: WorkspaceInfo }) {
  // Cookie d'espace périmé (espace supprimé, membre retiré) : on l'efface, sinon le Core refuserait chaque appel.
  useEffect(() => {
    if (!workspace?.activeId && /(?:^|;\s*)syxtee_ws=/.test(document.cookie)) document.cookie = "syxtee_ws=; path=/; max-age=0";
  }, [workspace?.activeId]);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
      }, []);
  // Pré-chargement : au repos, toutes les pages du menu sont préparées une à une (pas en rafale), donc le tiroir mobile
  // (dont les liens ne sont pas à l'écran) ouvre ses pages instantanément. Sauté en économie de données ou connexion lente.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$|3g/.test(conn?.effectiveType ?? "")) return;
    const hrefs = [...GROUPS, { items: HELP }].flatMap((g) => g.items).filter((i) => !i.external && !i.soon).map((i) => i.href);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const start = setTimeout(() => hrefs.forEach((h, i) => timers.push(setTimeout(() => router.prefetch(h), i * 250))), 1500);
    return () => {
      clearTimeout(start);
      timers.forEach(clearTimeout);
    };
  }, [router]);
  useEffect(() => setOpen(false), [pathname]);
  // Tiroir ouvert : la page derrière ne défile plus.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <WsCtx.Provider value={workspace ?? { workspaces: [], activeId: null, left: 0, features: null }}>
    <div className="dash-surface min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block">
        <Content admin={admin} onNavigate={() => {}} />
      </aside>

      <header className="sticky top-0 z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between gap-2 border-b border-line bg-background/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3" aria-label="Espace client SYXTEE">
          <Image src="/logo-400.png" alt="" width={20} height={28} style={{ width: 20, height: "auto" }} className="ink-img" priority />
          <span className="text-sm font-semibold">Espace client</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu de l'espace client">
          <button type="button" aria-label="Fermer le menu" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative h-dvh w-[300px] max-w-[88vw] border-r border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer le menu" className="absolute right-3 top-[calc(0.5rem+env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-lg hover:bg-foreground/10">
              <X size={18} />
            </button>
            <Content admin={admin} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-[264px] right-0 z-30 hidden h-10 items-center justify-between border-t border-line bg-surface px-4 text-xs text-muted lg:flex">
        <Link href="/docs" className="inline-flex items-center gap-2 font-mono transition-colors hover:text-foreground">
          /docs
        </Link>
        <a href="https://discord.gg/CD68F8yZuZ" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
          <span aria-hidden="true">+</span> Demander de l&apos;aide
        </a>
      </div>

      <MobileTabs onMenu={() => setOpen(true)} menuOpen={open} />

      <div className="relative min-w-0 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-12">
        <div className="relative">{children}</div>
      </div>
    </div>
    </WsCtx.Provider>
  );
}
