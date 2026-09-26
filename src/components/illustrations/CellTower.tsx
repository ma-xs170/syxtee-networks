// Antenne-relais 4G/5G filaire, posée sur l'horizon, avec sa LED « live ». Repère de la scène (x, top, horizon).
export default function CellTower({ x, top, horizon }: { x: number; top: number; horizon: number }) {
  const y1 = horizon - 20;
  const y2 = horizon - 38;
  return (
    <g stroke="currentColor" strokeWidth={1}>
      <path
        d={`M${x - 9} ${horizon}L${x} ${top}L${x + 9} ${horizon}M${x - 6} ${y1}H${x + 6}M${x - 3.5} ${y2}H${x + 3.5}M${x - 9} ${horizon}L${x + 6} ${y1}L${x - 3.5} ${y2}M${x + 9} ${horizon}L${x - 6} ${y1}L${x + 3.5} ${y2}`}
      />
      <path d={`M${x - 5} ${top + 2}v8M${x + 5} ${top + 2}v8`} strokeWidth={1.25} />
      <circle cx={x} cy={top - 3} r={1.6} className="led-blink" fill="var(--live)" stroke="none" />
    </g>
  );
}
