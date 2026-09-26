// Smartphone sur une perche, avec 3 ondes (4G, 5G, Wi-Fi). Générique, sans logo.
export default function PhoneIrl({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} fill="none" aria-hidden="true">
      {/* Ondes */}
      <g stroke="#fff" strokeLinecap="round">
        <path d="M196 72 A 36 36 0 0 1 226 110" strokeWidth="3" />
        <path d="M200 44 A 64 64 0 0 1 254 106" strokeWidth="3" strokeOpacity="0.6" />
        <path d="M204 16 A 92 92 0 0 1 282 102" strokeWidth="3" strokeOpacity="0.35" />
      </g>
      <g fontFamily="ui-monospace, monospace" fontSize="12" fill="#a3a3a3">
        <text x="232" y="128">4G</text>
        <text x="260" y="124">5G</text>
        <text x="266" y="36">Wi-Fi</text>
      </g>

      {/* Perche */}
      <path d="M150 196 L150 306" stroke="#737373" strokeWidth="8" strokeLinecap="round" />
      <path d="M150 262 L150 306" stroke="#525252" strokeWidth="12" strokeLinecap="round" />

      {/* Pince */}
      <rect x="138" y="186" width="24" height="16" rx="4" fill="#525252" />
      <path d="M112 96 L112 190 M188 96 L188 190" stroke="#737373" strokeWidth="6" strokeLinecap="round" />

      {/* Téléphone */}
      <rect x="104" y="56" width="92" height="150" rx="16" fill="#f5f5f5" />
      <rect x="110" y="62" width="80" height="138" rx="11" fill="#262626" />
      <rect x="136" y="68" width="28" height="7" rx="3.5" fill="#0a0a0a" />
      {/* Point live */}
      <circle cx="122" cy="88" r="3.5" fill="#fff" />
      <rect x="130" y="85" width="26" height="6" rx="3" fill="#525252" />
      {/* Barres réseau */}
      <g fill="#a3a3a3">
        <rect x="160" y="174" width="4" height="8" rx="1" />
        <rect x="167" y="170" width="4" height="12" rx="1" />
        <rect x="174" y="166" width="4" height="16" rx="1" />
      </g>
    </svg>
  );
}
