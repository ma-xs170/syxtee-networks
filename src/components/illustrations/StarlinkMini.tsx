import { Illustration } from "./iso";
import { MiniDrawing, miniFrame } from "./mini3d";

// Starlink Mini sur sa béquille, en 3/4 : le même dessin que la scène 1 du scrollytelling, assemblé.
const assembled = miniFrame(0);

export default function StarlinkMini({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="30 130 350 320" className={className} animated={animated}>
      <ellipse cx={212} cy={392} rx={110} ry={14} fill="currentColor" fillOpacity={0.05} strokeOpacity={0.25} strokeDasharray="2 5" />
      <g className="illu-float">
        <MiniDrawing f={assembled} led />
      </g>
    </Illustration>
  );
}
