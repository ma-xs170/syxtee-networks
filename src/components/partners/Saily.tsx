import Image from "next/image";
import { isFilled, partners } from "@/lib/site";

// Briques partenaire Saily. Tous les liens passent par partners.saily (src/lib/site.ts).
const saily = partners.saily;

/** URL du lien partenaire ; tant qu'il n'est pas renseigné, le site Saily. */
export const sailyUrl = isFilled(saily.url) ? saily.url : "https://saily.com";

/** Attributs communs à tous les liens Saily. */
export const sailyLinkProps = { href: sailyUrl, target: "_blank", rel: "sponsored noopener" } as const;

/** Logo officiel (kit partenaire), sinon le nom en texte. */
export function SailyLogo({ className = "h-5 w-auto" }: { className?: string }) {
  return saily.logo ? (
    <Image src={saily.logo} alt={saily.name} width={1738} height={1067} className={`ink-img ${className ?? ""}`} />
  ) : (
    <span className="font-semibold">{saily.name}</span>
  );
}

/** Mention obligatoire sous chaque bouton ou carte Saily. */
export function PartnerNote({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted ${className}`}>
      Lien partenaire : SYXTEE NETWORKS peut percevoir une commission, sans surcoût pour toi.
    </p>
  );
}

/** Bouton « Obtenir une eSIM Saily » + code promo (s'il est rempli et `code`) + mention. */
export function SailyLink({ variant = "primary", note = true, code = true }: { variant?: "primary" | "ghost"; note?: boolean; code?: boolean }) {
  const styles =
    variant === "primary" ? "btn-tonal" : "border border-line text-foreground hover:bg-foreground/10";
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <a
          {...sailyLinkProps}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-colors ${styles}`}
        >
          Obtenir une eSIM {saily.name} <span aria-hidden="true">↗</span>
        </a>
        {code && isFilled(saily.code) && (
          <p className="font-mono text-xs text-muted">
            Code promo : <span className="text-foreground">{saily.code}</span>
          </p>
        )}
      </div>
      {note && <PartnerNote className="mt-3" />}
    </div>
  );
}
