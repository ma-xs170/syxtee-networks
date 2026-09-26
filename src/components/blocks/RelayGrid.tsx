import RackMini from "@/components/relay/RackMini";
import { relays, site } from "@/lib/site";

export default function RelayGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {relays.map((r) => (
        <div key={r.city} className="rounded-2xl border border-line p-6">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold">{r.city}</p>
            {r.status === "online" ? (
              <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-foreground">
                <span className="live-dot" /> En ligne
              </span>
            ) : (
              <span className="font-mono text-xs uppercase text-muted">Bientôt</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{r.region}</p>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {r.protocols.map((p) => (
                <span key={p} className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">{p}</span>
              ))}
            </div>
            <RackMini online={r.status === "online"} />
          </div>
        </div>
      ))}

      <a
        href={site.discord}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-col justify-between rounded-2xl border border-dashed border-line p-6 transition-colors hover:bg-white/[0.03]"
      >
        <p className="text-lg font-semibold text-muted">Ta région ?</p>
        <p className="mt-6 text-sm text-muted">
          Vote pour le prochain relais sur le Discord <span aria-hidden="true">→</span>
        </p>
      </a>
    </div>
  );
}
