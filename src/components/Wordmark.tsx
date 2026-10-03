import Image from "next/image";

// Logo S + « SYXTEE » + la fonction du produit en gris : (S) SYXTEE RELAIS, (S) SYXTEE MIX, (S) SYXTEE PRO.
// Même écriture que la barre du site (« SYXTEE NETWORKS »).
export default function Wordmark({ name, size = "md", onAccent = false, className = "" }: { name: string; size?: "sm" | "md" | "lg"; /** Sur un fond plein (encre) : logo et texte inversés. */ onAccent?: boolean; className?: string }) {
  const dim = size === "lg" ? { w: 22, h: 30, t: "text-xl" } : size === "sm" ? { w: 11, h: 15, t: "text-xs" } : { w: 14, h: 19, t: "text-sm" };
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap ${className}`}>
      <Image src="/logo-400.png" alt="" width={dim.w} height={dim.h} className={`${onAccent ? "ink-img-rev" : "ink-img"} shrink-0`} />
      <span className={`${dim.t} font-semibold uppercase tracking-[0.16em]`}>
        SYXTEE <span className={`font-normal ${onAccent ? "" : "text-muted"}`}>{name}</span>
      </span>
    </span>
  );
}
