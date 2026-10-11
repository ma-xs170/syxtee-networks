import Scene3D from "./Scene3D";
import type { SceneKind } from "./scenes3d/engine";

// « Il marche n'importe où » : six dioramas 3D (bateau, hélicoptère, montagne, marathon, désert, foule), avec le vrai Encodeur dans chaque scène.
const scenes: { kind: SceneKind; title: string; text: string; span: string; h: string }[] = [
  { kind: "boat", title: "Sur un bateau", text: "Un terminal satellite en Ethernet, et le direct tient en pleine mer.", span: "lg:col-span-2", h: "h-72 sm:h-80" },
  { kind: "heli", title: "Dans un hélicoptère", text: "Des images aériennes en direct, sans attendre l'atterrissage.", span: "", h: "h-72 sm:h-80" },
  { kind: "mountain", title: "En montagne", text: "Un sommet, un col, un sentier : la 4G et le satellite se complètent.", span: "", h: "h-64" },
  { kind: "marathon", title: "Sur un marathon", text: "Un direct qui suit les coureurs sur 42 km, sans coupure.", span: "", h: "h-64" },
  { kind: "desert", title: "En plein désert", text: "Aucun réseau mobile à l'horizon : le ciel suffit.", span: "", h: "h-64" },
  { kind: "crowd", title: "Dans une foule", text: "Festival, manifestation : tes connexions se partagent, le flux reste stable.", span: "sm:col-span-2 lg:col-span-3", h: "h-64 sm:h-80" },
];

export default function Scenes() {
  return (
    <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scenes.map((s) => (
        <li key={s.kind} className={`bento-cell flex flex-col p-5 ${s.span}`}>
          <div className={`${s.h} w-full`}>
            <Scene3D kind={s.kind} label={`${s.title} : diorama 3D de l'Encodeur`} />
          </div>
          <h3 className="mt-5 px-2 text-lg font-semibold tracking-tight">{s.title}</h3>
          <p className="mt-1.5 max-w-[48ch] px-2 pb-1 text-sm leading-relaxed text-muted">{s.text}</p>
        </li>
      ))}
    </ul>
  );
}
