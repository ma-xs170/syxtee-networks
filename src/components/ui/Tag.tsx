export function Badge({ children }: { children: string }) {
  return <span className="whitespace-nowrap rounded border border-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">{children}</span>;
}
