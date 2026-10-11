// Schéma du fonctionnement : caméra, câble HDMI, Encodeur, quatre liaisons (4G, 5G, Wi-Fi, satellite), serveur SYXTEE, plateformes.
// Tout en trait encre ; seule la LED « en direct » du serveur est rouge.
const LINKS = [
  { y: 70, label: "4G" },
  { y: 130, label: "5G" },
  { y: 190, label: "Wi-Fi" },
  { y: 250, label: "Satellite" },
];

export default function HowItWorks() {
  return (
    <div className="bento-cell p-4 sm:p-8">
      <svg viewBox="0 0 1000 320" role="img" aria-label="La caméra est reliée en HDMI à l'Encodeur, qui envoie le direct par la 4G, la 5G, le Wi-Fi et le satellite vers un serveur SYXTEE, puis vers YouTube, Twitch et Kick." className="h-auto w-full text-foreground" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        {/* caméra */}
        <g>
          <rect x={20} y={118} width={92} height={64} rx={8} fill="currentColor" fillOpacity={0.05} />
          <rect x={112} y={132} width={26} height={36} rx={4} />
          <circle cx={125} cy={150} r={9} />
          <path d="M34 118 V108 H70 V118" />
          <circle cx={46} cy={150} r={3} fill="currentColor" stroke="none" />
        </g>
        {/* câble HDMI */}
        <path d="M138 150 H214" />
        <path d="M214 142 H234 V158 H214 Z" fill="currentColor" fillOpacity={0.08} />
        <text x={146} y={134} fill="currentColor" stroke="none" fontSize={11} className="font-mono" opacity={0.6}>HDMI</text>
        {/* Encodeur : dalle basse en aluminium, barre lumineuse en façade */}
        <g>
          <path d="M252 112 H366 L384 134 V176 Q384 190 370 190 H248 Q234 190 234 176 V134 Z" fill="currentColor" fillOpacity={0.07} />
          <path d="M234 134 H384" strokeOpacity={0.4} />
          <path d="M280 162 H338" strokeWidth={3} strokeOpacity={0.7} />
          <path d="M296 124 l8 -8 h-5 l7 -6" strokeOpacity={0.5} />
          <text x={309} y={208} textAnchor="middle" fill="currentColor" stroke="none" fontSize={10} className="font-mono" opacity={0.6}>SYXTEE</text>
        </g>
        {/* quatre liaisons */}
        {LINKS.map((l) => (
          <g key={l.label}>
            <path d={`M384 150 C 440 150, 440 ${l.y}, 500 ${l.y} H 620`} strokeDasharray="5 9" className="flow-dash" />
            <rect x={500} y={l.y - 13} width={l.label === "Satellite" ? 78 : 50} height={26} rx={13} fill="var(--background)" />
            <text x={l.label === "Satellite" ? 539 : 525} y={l.y + 4} textAnchor="middle" fill="currentColor" stroke="none" fontSize={12} className="font-mono">{l.label}</text>
          </g>
        ))}
        {/* serveur SYXTEE */}
        <g>
          <rect x={620} y={96} width={110} height={128} rx={10} fill="currentColor" fillOpacity={0.05} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={634} y={110 + i * 36} width={82} height={26} rx={5} />
              <path d={`M642 ${123 + i * 36} h30`} strokeOpacity={0.5} />
            </g>
          ))}
          <circle cx={702} cy={123} r={3} className="led-blink" fill="var(--live)" stroke="none" />
        </g>
        {/* vers les plateformes */}
        {["YouTube", "Twitch", "Kick"].map((p, i) => (
          <g key={p}>
            <path d={`M730 160 C 790 160, 790 ${100 + i * 60}, 840 ${100 + i * 60}`} strokeDasharray="5 9" className="flow-dash" />
            <rect x={840} y={84 + i * 60} width={120} height={34} rx={17} fill="currentColor" fillOpacity={0.05} />
            <text x={900} y={106 + i * 60} textAnchor="middle" fill="currentColor" stroke="none" fontSize={13}>{p}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}
