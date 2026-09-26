import { Illustration, IsoBox, IsoShadow, Led, Screw, faces, iso, wavy } from "./iso";

/** Starlink Mini posé à plat (face au ciel), version compacte pour les compositions. */
export function FlatMini({ at, w = 120, d = 104 }: { at: [number, number, number]; w?: number; d?: number }) {
  const cols = 8;
  const rows = 7;
  return (
    <IsoBox
      at={at}
      size={[w, d, 6]}
      r={6}
      top={
        <g strokeWidth={1}>
          <rect x={6} y={6} width={w - 12} height={d - 12} rx={4} opacity={0.6} />
          {Array.from({ length: cols * rows }, (_, i) => (
            <rect
              key={i}
              x={12 + (i % cols) * ((w - 24) / cols) + 2}
              y={12 + Math.floor(i / cols) * ((d - 24) / rows) + 2}
              width={(w - 24) / cols - 4}
              height={(d - 24) / rows - 4}
              rx={0.8}
              strokeWidth={0.75}
              opacity={0.5}
            />
          ))}
        </g>
      }
      front={<Led x={w - 10} y={-3} r={1.4} />}
    />
  );
}

/** Powerbank USB-C compacte (réutilisée dans Powerbank). */
export function PowerbankBox({ at, size = [70, 40, 16] }: { at: [number, number, number]; size?: [number, number, number] }) {
  const [w, , h] = size;
  return (
    <IsoBox
      at={at}
      size={size}
      r={4}
      top={<path d={`M${w / 2 + 3} 8l-8 12h9l-8 12`} strokeWidth={1} transform={`translate(0 ${(size[1] - 40) / 2})`} />}
      front={
        <g strokeWidth={1}>
          <rect x={8} y={-h / 2 - 2.5} width={12} height={5} rx={2.5} />
          {[0, 1, 2].map((k) => (
            <circle key={k} cx={w - 26 + k * 6} cy={-h / 2} r={1.2} fill="currentColor" />
          ))}
          <Led x={w - 8} y={-h / 2} r={1.3} />
        </g>
      }
    />
  );
}

// Sac à dos ouvert, le Mini posé à plat dessus, le câble qui ondule jusqu'à la powerbank.
const BW = 130;
const BD = 70;
const BH = 150;

export default function StarlinkMiniBag({ className, animated = true }: { className?: string; animated?: boolean }) {
  const lid = faces(-BW / 2, -BD / 2, BH, BW, BD, 0);
  const [px, py] = iso(BW / 2 + 30, 40, 8); // port USB-C de la powerbank
  const [mx, my] = iso(BW / 2 + 4, BD / 2 + 4, BH + 14); // prise du Mini
  return (
    <Illustration viewBox="-150 -270 330 380" className={className} animated={animated}>
      <IsoShadow at={[-BW / 2 - 14, -BD / 2 - 14, 0]} size={[BW + 120, BD + 60]} />

      {/* Powerbank au sol + câble */}
      <PowerbankBox at={[BW / 2 + 22, 0, 0]} />
      <path d={wavy([mx, my], [px, py], 4, 6)} strokeWidth={1} />

      <g className="illu-float">
        {/* Sac */}
        <IsoBox
          at={[-BW / 2, -BD / 2, 0]}
          size={[BW, BD, BH]}
          r={16}
          front={
            <g strokeWidth={1}>
              {/* Poche avant avec fermeture éclair */}
              <rect x={18} y={-78} width={BW - 36} height={60} rx={12} />
              <path d={`M26 -66H${BW - 26}`} strokeDasharray="1.5 2.5" />
              <path d={`M${BW - 30} -66v8`} />
              <circle cx={BW - 30} cy={-56} r={2} />
              {/* Coutures */}
              <path d={`M10 -${BH - 30}H${BW - 10}`} strokeDasharray="2 4" opacity={0.6} />
            </g>
          }
          side={
            <g strokeWidth={1}>
              {/* Poche latérale + sangle */}
              <rect x={12} y={-70} width={BD - 24} height={46} rx={10} />
              <path d={`M8 -110h${BD - 16}`} />
              <rect x={BD / 2 - 5} y={-114} width={10} height={8} rx={1.5} />
            </g>
          }
        />
        {/* Ouverture du sac et rabat replié vers l'arrière */}
        <g transform={lid.top}>
          <rect x={8} y={6} width={BW - 16} height={BD - 12} rx={10} strokeDasharray="3 3" opacity={0.7} />
        </g>
        <path
          d={`M${iso(-BW / 2 + 10, -BD / 2, BH).join(" ")}L${iso(-BW / 2 + 16, -BD / 2 - 40, BH + 50).join(" ")}L${iso(BW / 2 - 16, -BD / 2 - 40, BH + 50).join(" ")}L${iso(BW / 2 - 10, -BD / 2, BH).join(" ")}`}
          fill="currentColor"
          fillOpacity={0.03}
        />

        {/* Le Mini à plat sur le dessus */}
        <FlatMini at={[-BW / 2 - 4, -BD / 2 - 14, BH + 12]} w={BW + 8} d={BD + 28} />
        <Screw x={iso(-BW / 2 + 4, BD / 2 + 12, BH + 12)[0]} y={iso(-BW / 2 + 4, BD / 2 + 12, BH + 12)[1]} r={1.4} />
      </g>
    </Illustration>
  );
}
