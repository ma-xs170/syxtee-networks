import type { ReactNode } from "react";
import { Illustration, IsoBox } from "../illustrations/iso";
import ObsScreen from "../illustrations/ObsScreen";
import PhoneAndroid from "../illustrations/PhoneAndroid";
import PhoneMoblin from "../illustrations/PhoneMoblin";
import RelayServer from "../illustrations/RelayServer";
import Streamer from "../illustrations/Streamer";
import type { DashIcon } from "@/lib/dashboard-nav";

// Mini-illustrations filaires des menus du dashboard : même perspective et même trait que les illustrations du site.
// Les dessins propres au dashboard sont plaqués sur un écran plat (face avant, repère 160 × 100).

const W = 160;
const H = 100;

function Panel({ children, className, animated = false }: { children: ReactNode; className?: string; animated?: boolean }) {
  return (
    <Illustration viewBox="-18 -112 170 210" className={className} animated={animated}>
      <g className="illu-float">
        <IsoBox at={[0, -5, 0]} size={[W, 10, H]} r={5} front={<g strokeWidth={1}>{children}</g>} />
      </g>
    </Illustration>
  );
}

/** Courbe de débit, avec ses lignes de grille. */
const Curve = () => (
  <>
    <path d={`M12 ${-H + 30}H${W - 12}M12 ${-H + 55}H${W - 12}M12 ${-H + 80}H${W - 12}`} strokeOpacity={0.3} strokeDasharray="2 4" />
    <path d={`M12 ${-H + 62}L30 ${-H + 50}L44 ${-H + 56}L60 ${-H + 34}L78 ${-H + 44}L92 ${-H + 70}L106 ${-H + 40}L124 ${-H + 30}L148 ${-H + 38}`} />
    <circle cx={148} cy={-H + 38} r={3} />
  </>
);

export function HealthArt() {
  return (
    <>
      <Curve />
      <path d={`M12 ${-H + 16}h24M44 ${-H + 16}h14`} />
    </>
  );
}

export function StatsArt() {
  const bars = [30, 46, 22, 58, 40, 66, 52];
  return (
    <>
      {bars.map((h, i) => (
        <rect key={i} x={16 + i * 19} y={-12 - h} width={11} height={h} rx={1.5} />
      ))}
      <path d={`M12 ${-H + 44}L40 ${-H + 36}L70 ${-H + 42}L100 ${-H + 24}L148 ${-H + 16}`} strokeDasharray="3 3" />
    </>
  );
}

function LivesArt() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(0 ${-H + 16 + i * 21})`}>
          <path d="M14 -4L20 0L14 4Z" />
          <path d={`M28 0H${60 + ((i * 23) % 40)}`} />
          <path d={`M110 0H146`} strokeOpacity={0.4} />
        </g>
      ))}
    </>
  );
}

function MapArt() {
  return (
    <>
      <path d={`M10 ${-H + 70}C40 ${-H + 60} 50 ${-H + 90} 80 ${-H + 78}S130 ${-H + 60} 150 ${-H + 70}`} strokeOpacity={0.3} />
      <path d={`M10 ${-H + 40}C44 ${-H + 30} 60 ${-H + 52} 96 ${-H + 38}S136 ${-H + 20} 150 ${-H + 28}`} strokeOpacity={0.3} />
      <path d={`M20 ${-18}L52 ${-H + 58}L84 ${-H + 64}L112 ${-H + 34}L140 ${-H + 26}`} strokeDasharray="3 3" />
      {[
        [52, -H + 58],
        [84, -H + 64],
        [112, -H + 34],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r={2.5} />
      ))}
      <path d={`M140 ${-H + 26}c-7 0 -10 -5 -10 -9a10 10 0 0 1 20 0c0 4 -3 9 -10 9Z`} />
      <circle cx={140} cy={-H + 17} r={3} />
    </>
  );
}

export function MireArt() {
  return (
    <>
      {Array.from({ length: 7 }, (_, i) => (
        <rect key={i} x={12 + i * 19.4} y={-H + 12} width={19.4} height={48} strokeOpacity={0.7} />
      ))}
      <path d={`M12 ${-H + 70}H${W - 12}`} strokeOpacity={0.4} />
      <path d={`M40 ${-H + 82}h80`} />
    </>
  );
}

function SecurityArt() {
  return (
    <>
      <circle cx={52} cy={-H + 50} r={18} />
      <circle cx={52} cy={-H + 50} r={6} />
      <path d={`M70 ${-H + 50}H138M122 ${-H + 50}v12M134 ${-H + 50}v8`} />
      <path d={`M16 ${-H + 88}h${W - 32}`} strokeOpacity={0.3} strokeDasharray="2 4" />
    </>
  );
}

function SettingsArt() {
  return (
    <>
      {[
        [-H + 26, 50],
        [-H + 50, 110],
        [-H + 74, 76],
      ].map(([y, k]) => (
        <g key={y}>
          <path d={`M16 ${y}H${W - 16}`} strokeOpacity={0.4} />
          <circle cx={k} cy={y} r={6} />
        </g>
      ))}
    </>
  );
}

/** Scanner : ondes autour d'un point, jauge de débit. */
export function ScanArt() {
  return (
    <>
      {[14, 26, 38].map((r) => (
        <path key={r} d={`M${48 - r} ${-H + 62}a${r} ${r} 0 0 1 ${2 * r} 0`} strokeOpacity={r === 38 ? 0.4 : 0.8} />
      ))}
      <circle cx={48} cy={-H + 62} r={3} />
      <path d={`M100 ${-H + 62}a22 22 0 0 1 44 0`} strokeOpacity={0.3} />
      <path d={`M100 ${-H + 62}a22 22 0 0 1 34 -17`} />
      <path d={`M100 ${-H + 80}h44M100 ${-H + 88}h26`} strokeOpacity={0.5} />
    </>
  );
}

export default function DashArt({ icon, className = "h-full w-full" }: { icon: DashIcon; className?: string }) {
  switch (icon) {
    case "relays":
      return <RelayServer animated={false} className={className} />;
    case "urls":
      return <PhoneMoblin waves={false} animated={false} className={className} />;
    case "preview":
      return <ObsScreen animated={false} className={className} />;
    case "control":
    case "cam":
      return <PhoneAndroid screen="moblink" animated={false} className={className} />;
    case "profile":
      return <Streamer animated={false} className={className} />;
    case "plan":
      return <RelayServer animated={false} className={className} />;
    case "health":
      return <Panel className={className}><HealthArt /></Panel>;
    case "stats":
      return <Panel className={className}><StatsArt /></Panel>;
    case "lives":
      return <Panel className={className}><LivesArt /></Panel>;
    case "map":
      return <Panel className={className}><MapArt /></Panel>;
    case "mire":
      return <Panel className={className}><MireArt /></Panel>;
    case "scan":
      return <Panel className={className}><ScanArt /></Panel>;
    case "security":
      return <Panel className={className}><SecurityArt /></Panel>;
    case "settings":
      return <Panel className={className}><SettingsArt /></Panel>;
  }
}

/** Grande version animée (carte « Découvrir tes statistiques », pages à venir). */
export function DashIllustration({ icon, className }: { icon: "stats" | "health" | "map" | "mire" | "scan"; className?: string }) {
  const art = { stats: <StatsArt />, health: <HealthArt />, map: <MapArt />, mire: <MireArt />, scan: <ScanArt /> }[icon];
  return (
    <Panel className={className} animated>
      {art}
    </Panel>
  );
}
