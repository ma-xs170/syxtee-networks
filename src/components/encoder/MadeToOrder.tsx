import { product } from "@/config/product";

/** Avertissement de fabrication : tarif bas, quantités limitées, fabrication artisanale sur commande, délai de 4 mois maximum. */
export default function MadeToOrder({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { title, text, delay } = product.madeToOrder;
  if (compact)
    return (
      <p className={`text-sm leading-relaxed text-muted ${className}`}>
        <span className="font-medium text-foreground">{title}</span> {text} <span className="text-foreground">{delay}</span>
      </p>
    );
  return (
    <div className={`bento-cell p-7 sm:p-9 ${className}`}>
      <h2 className="h-section">Fabriqué <em>sur commande.</em></h2>
      <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-muted"><span className="font-medium text-foreground">{title}</span> {text}</p>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-foreground">{delay}</p>
    </div>
  );
}
