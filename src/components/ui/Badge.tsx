import type { ReactNode } from "react";

type Tone = "neutral" | "ok" | "warn" | "bad";
const tones: Record<Tone, string> = {
  neutral: "bg-foreground/[0.08] text-muted",
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
};

/** Badge arrondi : rôle, statut, formule. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
