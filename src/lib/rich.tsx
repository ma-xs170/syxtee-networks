import type { ReactNode } from "react";

/** Texte courant avec mots clés en gras : « un **relais SRTLA** » devient un <strong>. */
export function rich(text: string): ReactNode {
  return text.split("**").map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}
