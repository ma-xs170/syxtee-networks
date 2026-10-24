import L from "./L";
import { EN } from "@/lib/i18n";

/** Libellé français + traduction du dictionnaire (src/lib/i18n.ts) ; sans entrée, le texte reste identique dans les deux langues. */
export default function T({ children }: { children: string }) {
  return <L fr={children} en={EN[children] ?? children} />;
}
