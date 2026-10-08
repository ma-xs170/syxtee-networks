import type { ReactNode } from "react";
import GlassIcon, { type GlassName } from "./GlassIcon";

/** En-tête de section : icône verre centrée, titre serif, sous-titre gris (560 px max). `align="left"` pour l'alternance. */
export default function SectionHeader({ icon, title, subtitle, align = "center", link }: { icon?: GlassName; title: ReactNode; subtitle?: ReactNode; align?: "center" | "left"; link?: ReactNode }) {
  const c = align === "center";
  return (
    <header className={`flex flex-col ${c ? "items-center text-center" : "items-start text-left"}`}>
      {icon && <GlassIcon name={icon} size={72} />}
      <h2 className={`h-serif ${icon ? "mt-8" : ""} ${c ? "mx-auto" : ""} max-w-[18ch] text-[clamp(2.5rem,5.5vw,4.5rem)]`}>{title}</h2>
      {subtitle && <p className={`mt-5 max-w-[560px] text-base leading-relaxed text-muted ${c ? "mx-auto" : ""}`}>{subtitle}</p>}
      {link && <div className="mt-5 text-sm">{link}</div>}
    </header>
  );
}
