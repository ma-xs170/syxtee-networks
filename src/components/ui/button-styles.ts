// Classes des boutons, sans composant : utilisables dans les composants serveur comme dans les composants client.
export type Variant = "primary" | "secondary" | "danger" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[background-color,border-color,transform,opacity] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
const variants: Record<Variant, string> = {
  primary: "relative h-10 overflow-hidden rounded-full btn-tonal px-5",
  secondary: "relative h-10 overflow-hidden rounded-full btn-tonal px-5",
  danger: "h-10 rounded-[10px] bg-bad/15 px-4 text-bad hover:bg-bad/25",
  ghost: "h-10 rounded-[10px] px-3 text-muted hover:text-foreground",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}
