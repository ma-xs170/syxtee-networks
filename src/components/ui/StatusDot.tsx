type Status = "live" | "unstable" | "offline" | "idle";
const dot: Record<Status, string> = { live: "bg-ok", unstable: "bg-warn", offline: "bg-bad", idle: "bg-muted" };
const text: Record<Status, string> = { live: "text-ok", unstable: "text-warn", offline: "text-bad", idle: "text-muted" };
const defaults: Record<Status, string> = { live: "En direct", unstable: "Instable", offline: "Déconnecté", idle: "Inactif" };

/** Statut en pastille + texte : vert (direct), orange (instable), rouge (déconnecté). Le seul endroit où les couleurs vives sont permises. */
export default function StatusDot({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium ${text[status]}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {label ?? defaults[status]}
    </span>
  );
}
