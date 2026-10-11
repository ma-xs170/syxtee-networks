// « Il marche n'importe où » : six cartes, chacune avec un plan de couleur et un pictogramme filaire (comme les cartes de la page Contrôle à distance).
const svg = { viewBox: "0 0 48 48", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", className: "h-14 w-14", "aria-hidden": true } as const;

const items: { title: string; text: string; tint: string; icon: React.ReactNode }[] = [
  {
    title: "Sur un bateau",
    text: "Un terminal satellite en Ethernet, et le direct tient en pleine mer.",
    tint: "from-sky-500 to-blue-600",
    icon: (
      <svg {...svg}>
        <path d="M24 6v24M24 8l12 18H24M24 12L14 26h10" />
        <path d="M6 32h36l-6 8H12zM4 44c4-3 8-3 10 0s6 3 10 0 8-3 10 0 6 3 10 0" />
      </svg>
    ),
  },
  {
    title: "Dans un hélicoptère",
    text: "Des images aériennes en direct, sans attendre l'atterrissage.",
    tint: "from-violet-500 to-pink-500",
    icon: (
      <svg {...svg}>
        <path d="M6 10h36M24 10v6" />
        <path d="M12 28c0-7 5-12 12-12s10 5 10 12v2H12zM34 24h10v4l-10 2" />
        <path d="M14 38h22M18 30v8M30 30v8" />
      </svg>
    ),
  },
  {
    title: "En montagne",
    text: "Un sommet, un col, un sentier : la 4G et le satellite se complètent.",
    tint: "from-emerald-500 to-teal-600",
    icon: (
      <svg {...svg}>
        <path d="M4 40L18 14l8 14 5-8 13 20z" />
        <path d="M14 20l4 4 4-4M29 24l2 3 3-3" />
      </svg>
    ),
  },
  {
    title: "Sur un marathon",
    text: "Un direct qui suit les coureurs sur 42 km, sans coupure.",
    tint: "from-amber-400 to-orange-500",
    icon: (
      <svg {...svg}>
        <circle cx="28" cy="8" r="4" />
        <path d="M22 18l6-2 4 6 6 2M28 16l-4 10 8 6 2 10M24 26l-8 6-6-2" />
      </svg>
    ),
  },
  {
    title: "En plein désert",
    text: "Aucun réseau mobile à l'horizon : le ciel suffit.",
    tint: "from-orange-500 to-rose-500",
    icon: (
      <svg {...svg}>
        <circle cx="34" cy="14" r="6" />
        <path d="M4 38c6-8 12-8 18 0s12 8 22-2M4 44h40" />
      </svg>
    ),
  },
  {
    title: "Dans une foule",
    text: "Festival, manifestation : tes connexions se partagent, le flux reste stable.",
    tint: "from-fuchsia-500 to-indigo-600",
    icon: (
      <svg {...svg}>
        <circle cx="16" cy="14" r="4" />
        <circle cx="32" cy="14" r="4" />
        <path d="M8 36v-6a8 8 0 0 1 16 0v6M24 36v-6a8 8 0 0 1 16 0v6" />
      </svg>
    ),
  },
];

export default function Anywhere() {
  return (
    <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <li key={it.title} className="bento-cell flex flex-col p-4">
          <div className={`grid h-40 place-items-center rounded-2xl bg-gradient-to-br ${it.tint} text-white shadow-lg`}>{it.icon}</div>
          <h3 className="mt-5 px-3 text-lg font-semibold tracking-tight">{it.title}</h3>
          <p className="mt-1.5 px-3 pb-3 text-sm leading-relaxed text-muted">{it.text}</p>
        </li>
      ))}
    </ul>
  );
}
