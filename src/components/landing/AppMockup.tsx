import StatusDot from "../ui/StatusDot";
import { Badge } from "../ui/Badge";
import { product } from "@/config/product";

// Mockup généré de la page Appareils du dashboard : le boîtier apparaît comme un appareil lié. Données d'exemple.
const bars = (n: number) => (
  <span className="inline-flex items-end gap-0.5" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => (
      <span key={i} className={`w-1 rounded-sm ${i < n ? "bg-ok" : "bg-foreground/15"}`} style={{ height: 4 + i * 3 }} />
    ))}
  </span>
);

export default function AppMockup() {
  return (
    <div className="bento-cell overflow-hidden">
      <div className="grid md:grid-cols-[200px_1fr]">
        <aside className="hidden border-r border-line p-4 md:block" aria-hidden="true">
          <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">mathis</div>
          <ul className="mt-5 space-y-1 text-sm text-muted">
            {["Stream", "Relais", "Appareils", "Métriques", "Logs"].map((l) => (
              <li key={l} className={`rounded-lg px-3 py-2 ${l === "Appareils" ? "bg-surface-2 text-foreground" : ""}`}>{l}</li>
            ))}
          </ul>
        </aside>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-2xl font-medium tracking-tight">Appareils</p>
            <span className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-medium text-on-accent">Lier un boîtier</span>
          </div>
          <div className="mt-6 rounded-2xl border border-line bg-background/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{product.name} · Boîtier 01</p>
                <p className="mt-0.5 font-mono text-xs text-muted">192.168.1.42 · firmware v{product.specs.firmware}</p>
              </div>
              <StatusDot status="live" label="En ligne" />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                ["4G", bars(3)],
                ["5G", bars(4)],
                ["Satellite", bars(4)],
                ["Température", <span key="t" className="font-mono">41 °C</span>],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="mt-1.5">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-[10px] border border-line-strong bg-surface-2 px-4 py-2 text-sm">Redémarrer</span>
              <span className="rounded-[10px] border border-line-strong bg-surface-2 px-4 py-2 text-sm">Mettre à jour</span>
              <Badge>Bonding activé</Badge>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">Exemple d&apos;interface.</p>
        </div>
      </div>
    </div>
  );
}
