import Link from "next/link";
import type { RelayView } from "@/lib/core";
import ProtocolBadge from "./ProtocolBadge";

// Choix du relais sur les pages Santé, Aperçu et Historique (?relay=<id>). Masqué s'il n'y a qu'un relais.

export default function RelayPicker({ relays, current, base, all }: { relays: Pick<RelayView, "id" | "name" | "live" | "protocol">[]; current: string | null; base: string; all?: boolean }) {
  if (relays.length < 2 && !all) return null;
  const pill = (active: boolean) =>
    `inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors ${
      active ? "border-accent bg-accent text-on-accent" : "border-line text-muted hover:bg-foreground/10 hover:text-foreground"
    }`;
  return (
    <nav aria-label="Relais" className="mb-6 flex flex-wrap gap-2">
      {all && (
        <Link href={base} className={pill(current === null)} aria-current={current === null ? "page" : undefined}>
          Tous les relais
        </Link>
      )}
      {relays.map((r) => (
        <Link key={r.id} href={`${base}?relay=${r.id}`} className={pill(current === r.id)} aria-current={current === r.id ? "page" : undefined}>
          {r.live && <span className="live-dot" aria-label="En live" />}
          {r.name}
          <ProtocolBadge protocol={r.protocol} className={current === r.id ? "border-current/40 text-current" : "border-line text-muted"} />
        </Link>
      ))}
    </nav>
  );
}
