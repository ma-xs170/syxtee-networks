import { notFound } from "next/navigation";
import * as Animated from "@/components/icons/animated";

// Vitrine de dev des icônes animées (survole ou touche une icône pour jouer son animation). Absente en production.
export default function IconesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const icons = Object.entries(Animated).sort(([a], [b]) => a.localeCompare(b));
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Icônes animées ({icons.length})</h1>
      <p className="mt-2 text-sm text-muted">Survole ou touche une icône. Les ondes de Broadcast bougent au repos.</p>
      <ul className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {icons.map(([name, Icon]) => (
          <li key={name}>
            <button type="button" className="ai-host flex w-full flex-col items-center gap-3 rounded-xl border border-line bg-surface px-2 py-5 text-foreground">
              <Icon size={40} />
              <span className="font-mono text-[11px] text-muted">{name}</span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
