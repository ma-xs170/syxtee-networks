// Boîtier SYXTEE Encodeur en SVG : noir mat, bords chanfreinés, liseré lumineux, logo gravé, LED d'état et LED par port.
// `leds` : état de chaque port (ok vert, warn orange, bad rouge, off éteint). `live` : la LED d'état pulse en vert.
export type LedState = "ok" | "warn" | "bad" | "off";
const COLOR: Record<LedState, string> = { ok: "var(--ok)", warn: "var(--warn)", bad: "var(--bad)", off: "color-mix(in srgb, var(--foreground) 18%, transparent)" };

export default function RelayBox({ leds, live = true, className = "" }: { leds?: Partial<Record<"wifi" | "eth" | "cell" | "usb", LedState>>; live?: boolean; className?: string }) {
  const ports: { id: "wifi" | "eth" | "cell" | "usb"; label: string }[] = [
    { id: "wifi", label: "WIFI" },
    { id: "eth", label: "ETH" },
    { id: "cell", label: "4G/5G" },
    { id: "usb", label: "USB" },
  ];
  return (
    <svg viewBox="0 0 640 260" role="img" aria-label="Boîtier SYXTEE Encodeur" className={`h-auto w-full ${className}`}>
      <defs>
        <linearGradient id="rb-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2b2f" />
          <stop offset="1" stopColor="#141416" />
        </linearGradient>
        <linearGradient id="rb-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1b1e" />
          <stop offset="1" stopColor="#0b0b0c" />
        </linearGradient>
        <linearGradient id="rb-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="rb-shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="320" cy="232" rx="270" ry="20" fill="url(#rb-shadow)" />
      {/* dessus chanfreiné */}
      <path d="M70 92 L118 52 H522 L570 92 Z" fill="url(#rb-top)" stroke="#fff" strokeOpacity="0.12" />
      <path d="M118 52 H522" stroke="url(#rb-edge)" strokeWidth="1.5" />
      {/* face avant */}
      <path d="M70 92 H570 V196 Q570 212 554 212 H86 Q70 212 70 196 Z" fill="url(#rb-face)" stroke="#fff" strokeOpacity="0.14" />
      <path d="M70 92 H570" stroke="url(#rb-edge)" strokeWidth="2" />
      {/* logo gravé */}
      <g transform="translate(96 124)" fill="none" stroke="#fff" strokeOpacity="0.55">
        <rect x="0" y="0" width="34" height="34" rx="9" />
        <path d="M22 11c-3-2-12-2-12 3 0 6 14 3 14 9 0 5-10 5-14 2" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <text x="142" y="146" fill="#fff" fillOpacity="0.7" fontSize="15" fontWeight="600" letterSpacing="3" fontFamily="var(--font-geist-sans), system-ui, sans-serif">SYXTEE</text>
      <text x="142" y="164" fill="#fff" fillOpacity="0.38" fontSize="9" letterSpacing="4" fontFamily="var(--font-geist-sans), system-ui, sans-serif">NETWORKS</text>
      {/* LED d'état */}
      <g transform="translate(528 124)">
        <circle r="7" fill={live ? "var(--ok)" : COLOR.off} className={live ? "live-led" : ""} />
        <circle r="13" fill="none" stroke={live ? "var(--ok)" : COLOR.off} strokeOpacity="0.35" />
      </g>
      {/* LED par port */}
      {ports.map((p, i) => {
        const x = 304 + i * 62;
        const st = leds?.[p.id] ?? "ok";
        return (
          <g key={p.id} transform={`translate(${x} 172)`}>
            <rect x="-24" y="-12" width="48" height="24" rx="6" fill="#050506" stroke="#fff" strokeOpacity="0.14" />
            <circle cx="-11" cy="0" r="3.5" fill={COLOR[st]} style={{ transition: "fill 0.3s" }} />
            <text x="3" y="3.5" fill="#fff" fillOpacity="0.55" fontSize="9" fontFamily="var(--font-geist-mono), monospace" textAnchor="start">{p.label}</text>
          </g>
        );
      })}
      {/* aérations */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${340 + i * 22} 108 h12`} stroke="#fff" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />
      ))}
    </svg>
  );
}
