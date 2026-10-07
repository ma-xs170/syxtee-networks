// Un espace partagé en filaire : plusieurs OBS reliés à un même espace, et l'équipe (administrateurs, membres) qui le pilote.
// Trait fin, aucune couleur sauf la LED rouge « en direct » d'un des OBS.

// Vrais Mac (emoji : iMac et MacBook dans le style Apple), chacun avec son étiquette OBS ; une LED rouge sur celui qui est en direct.
const SCREENS = [
  { x: 22, y: 40, label: "OBS 1", live: true, icon: "🖥️" },
  { x: 22, y: 190, label: "OBS 2", live: false, icon: "💻" },
  { x: 398, y: 40, label: "OBS 3", live: false, icon: "💻" },
  { x: 398, y: 190, label: "OBS 4", live: false, icon: "🖥️" },
];
// Vrais personnages (emoji : rendus dans le style Apple sur Mac et iPhone). Le rôle est dans une étiquette sous chacun.
const PEOPLE = [
  { x: 214, role: "ADMIN", face: "🧑🏽‍💼" },
  { x: 260, role: "MEMBRE", face: "👩🏻‍💻" },
  { x: 306, role: "MEMBRE", face: "👨🏾‍💻" },
];

export default function SharedSpaceWire({ className = "h-full w-full", animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 520 300" fill="none" className={`text-foreground ${animated ? "" : "illu-still"} ${className}`} role="img" aria-label="Un espace partagé : quatre OBS reliés à un même espace, piloté par une équipe avec des rôles">
      <g className="svg-hairline" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
        {/* Liaisons OBS vers l'espace */}
        <path d="M122 76 C160 76 170 122 200 130" strokeDasharray="3 5" strokeOpacity={0.6} />
        <path d="M122 226 C160 226 170 180 200 170" strokeDasharray="3 5" strokeOpacity={0.6} />
        <path d="M398 76 C360 76 350 122 320 130" strokeDasharray="3 5" strokeOpacity={0.6} />
        <path d="M398 226 C360 226 350 180 320 170" strokeDasharray="3 5" strokeOpacity={0.6} />

        {/* Ordinateurs OBS */}
        {SCREENS.map((s) => (
          <g key={s.label}>
            <text x={s.x + 50} y={s.y + 50} textAnchor="middle" fontSize={62} stroke="none" fill="currentColor" aria-hidden="true">
              {s.icon}
            </text>
            <rect x={s.x + 26} y={s.y + 62} width={48} height={14} rx={7} fill="var(--background)" />
            <text x={s.x + 50} y={s.y + 72} textAnchor="middle" stroke="none" fill="var(--muted)" fontSize={7.5} className="font-mono" letterSpacing="0.12em">
              {s.label}
            </text>
            {s.live && <circle cx={s.x + 82} cy={s.y + 14} r={4} fill="var(--live)" stroke="none" className={animated ? "led-blink" : ""} />}
          </g>
        ))}

        {/* L'espace */}
        <rect x={200} y={112} width={120} height={76} rx={12} strokeWidth={1.75} fill="currentColor" fillOpacity={0.05} />
        {/* Logo SYXTEE au centre de l'espace (teinté par le thème, comme dans la barre du site) */}
        <image href="/logo-400.png" x={248} y={133} width={24} height={34} preserveAspectRatio="xMidYMid meet" className="ink-img" />

        {/* Équipe */}
        {PEOPLE.map((p) => (
          <g key={p.x}>
            <text x={p.x} y={62} textAnchor="middle" fontSize={34} stroke="none" fill="currentColor" aria-hidden="true">
              {p.face}
            </text>
            <rect x={p.x - 19} y={72} width={38} height={13} rx={6.5} fill="var(--background)" />
            <text x={p.x} y={81.5} textAnchor="middle" stroke="none" fill="var(--muted)" fontSize={6.5} className="font-mono" letterSpacing="0.1em">
              {p.role}
            </text>
            <path d={`M${p.x} 85V112`} strokeDasharray="2 4" strokeOpacity={0.6} />
          </g>
        ))}

        {/* Bas : un téléphone qui pilote */}
        <path d="M260 188v34" strokeDasharray="2 4" strokeOpacity={0.6} />
        <text x={260} y={268} textAnchor="middle" fontSize={50} stroke="none" fill="currentColor" aria-hidden="true">
          📱
        </text>
      </g>
    </svg>
  );
}
