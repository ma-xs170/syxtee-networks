"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import RelayServer from "@/components/illustrations/RelayServer";
import PacketSorter, { type SorterPacket } from "@/components/relay/PacketSorter";
import MotionTransform from "@/components/story/MotionTransform";
import StoryStage from "@/components/story/StoryStage";
import { band, clamp01, lerp, ramp } from "@/components/story/timeline";
import { useStoryClock } from "@/components/story/useStoryClock";
import CaribbeanMap, { GUADELOUPE, NEW_YORK } from "./CaribbeanMap";
import { LiveLines, LiveOverlay } from "./LiveScene";
import Street, { phoneAt } from "./Street";

// Visuel persistant du « voyage d'un live » : la rue → la carte → le relais → ton live.
// Tout est piloté par le progrès global `p` (4 scènes de 0,25). La caméra dézoome de la rue vers la carte
// (la rue devient le point lumineux de la Guadeloupe), puis zoome sur New York jusqu'au relais.

export type JourneyLayer = "street" | "map" | "relay" | "live";
const ALL: JourneyLayer[] = ["street", "map", "relay", "live"];

const [gx, gy] = GUADELOUPE;
const [nx, ny] = NEW_YORK;
const PHONE_END = phoneAt(1);

const PACKETS: SorterPacket[] = [
  { n: 3, lane: 0, at: 0 },
  { n: 1, lane: 1, at: 0.08 },
  { n: 5, lane: 2, at: 0.15 },
  { n: 2, lane: 1, at: 0.23 },
  { n: 6, lane: 0, at: 0.31 },
  { n: 4, lane: 2, at: 0.39 },
];

function StreetLayer({ p, time }: { p: MotionValue<number>; time: MotionValue<number> }) {
  const walk = useTransform(p, (v) => ramp(v, 0, 0.2));
  const waves = useTransform(p, (v) => ramp(v, 0.03, 0.15));
  // La rue rétrécit vers le téléphone, qui se pose sur la Guadeloupe.
  const zoom = useTransform(p, (v) => {
    const e = ramp(v, 0.2, 0.3);
    const s = lerp(1, 0.02, e);
    return `translate(${lerp(PHONE_END.x, gx, e)} ${lerp(PHONE_END.y, gy, e)}) scale(${s}) translate(${-PHONE_END.x} ${-PHONE_END.y})`;
  });
  const opacity = useTransform(p, (v) => 1 - ramp(v, 0.26, 0.3));
  return (
    <motion.g style={{ opacity }}>
      <MotionTransform transform={zoom}>
        <Street walk={walk} waves={waves} time={time} />
      </MotionTransform>
    </motion.g>
  );
}

function MapLayer({ p, time }: { p: MotionValue<number>; time: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => ramp(v, 0.22, 0.28) * (1 - ramp(v, 0.53, 0.58)));
  const zoomIn = useTransform(p, (v) => {
    const s = lerp(7, 1, ramp(v, 0.2, 0.32));
    return `translate(${gx} ${gy}) scale(${s}) translate(${-gx} ${-gy})`;
  });
  const zoomNy = useTransform(p, (v) => {
    const z = ramp(v, 0.46, 0.56);
    return `translate(${lerp(nx, 300, z)} ${lerp(ny, 160, z)}) scale(${1 + 5 * z}) translate(${-nx} ${-ny})`;
  });
  const draw = useTransform(p, (v) => ramp(v, 0.3, 0.38));
  const weak = useTransform(p, (v) => ramp(v, 0.4, 0.45));
  return (
    <motion.g style={{ opacity }}>
      <MotionTransform transform={zoomIn}>
        <MotionTransform transform={zoomNy}>
          <CaribbeanMap draw={draw} weak={weak} time={time} />
        </MotionTransform>
      </MotionTransform>
    </motion.g>
  );
}

function RelaySvg({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => band(v, 0.52, 0.56, 0.74, 0.79));
  const local = useTransform(p, (v) => clamp01((v - 0.54) / 0.2));
  return (
    <motion.g style={{ opacity }}>
      <PacketSorter p={local} packets={PACKETS} />
    </motion.g>
  );
}

function RelayOverlay({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => band(v, 0.52, 0.56, 0.74, 0.79));
  const scale = useTransform(p, (v) => lerp(0.85, 1, ramp(v, 0.5, 0.58)));
  return (
    <motion.div className="pointer-events-none absolute left-[27%] top-[4%] h-[52%] w-[46%]" style={{ opacity, scale }} aria-hidden="true">
      <RelayServer />
    </motion.div>
  );
}

function LiveSvg({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => ramp(v, 0.76, 0.81));
  const draw = useTransform(p, (v) => ramp(v, 0.78, 0.88));
  return (
    <motion.g style={{ opacity }}>
      <LiveLines draw={draw} />
    </motion.g>
  );
}

function LiveLayerOverlay({ p }: { p: MotionValue<number> }) {
  const opacity = useTransform(p, (v) => ramp(v, 0.76, 0.81));
  const draw = useTransform(p, (v) => ramp(v, 0.78, 0.88));
  const viewers = useTransform(p, (v) => ramp(v, 0.84, 0.98));
  const social = useTransform(p, (v) => ramp(v, 0.88, 0.92));
  return (
    <motion.div className="pointer-events-none absolute inset-0" style={{ opacity }}>
      <LiveOverlay draw={draw} viewers={viewers} social={social} />
    </motion.div>
  );
}

/** Le visuel complet, ou seulement certains calques (version statique d'une scène). */
export default function JourneyStage({ p, layers = ALL }: { p: MotionValue<number>; layers?: JourneyLayer[] }) {
  const time = useStoryClock();
  const has = (l: JourneyLayer) => layers.includes(l);
  return (
    <StoryStage
      overlay={
        <>
          {has("relay") && <RelayOverlay p={p} />}
          {has("live") && <LiveLayerOverlay p={p} />}
        </>
      }
    >
      {has("map") && <MapLayer p={p} time={time} />}
      {has("street") && <StreetLayer p={p} time={time} />}
      {has("relay") && <RelaySvg p={p} />}
      {has("live") && <LiveSvg p={p} />}
    </StoryStage>
  );
}
