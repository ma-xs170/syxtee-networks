"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { MotionValue } from "motion/react";
import { band, clamp01, easeOut, lerp, ramp } from "@/components/story/timeline";
import { PRO_TIMELINE as TL } from "./timeline";

// Modèle 3D procédural du SYXTEE PRO (aucun fichier externe) : sac en mesh, boîtier encodeur, compartiment Starlink Mini,
// 2 batteries. Deux rendus mêlés selon le scroll : SQUELETTE (filaire blanc) puis PLEIN (noir mat, key light + rim light).
// Légendes : calque HTML au-dessus du canvas, positionné en projetant des ancres 3D à chaque image.
// Tout est piloté dans useFrame à partir du progrès global de l'histoire : aucun re-render React pendant le scroll.

export type Mats = { solid: THREE.MeshStandardMaterial; wire: THREE.MeshBasicMaterial; line: THREE.LineBasicMaterial };

export function makeMats(color = "#0c0c0c", roughness = 0.55, metalness = 0.25): Mats {
  return {
    solid: new THREE.MeshStandardMaterial({ color, roughness, metalness, transparent: true }),
    wire: new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, depthWrite: false }),
    line: new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false }),
  };
}

/** Mélange squelette → plein. `k` : visibilité globale de la pièce (le sac s'efface en vue éclatée). */
export function applyMode(m: Mats, full: number, k = 1, wire = 0.1) {
  m.solid.opacity = full * k;
  m.solid.visible = full * k > 0.01;
  m.wire.opacity = wire * (1 - full) * k;
  m.wire.visible = m.wire.opacity > 0.005;
  m.line.opacity = lerp(0.85, 0.1, full) * k;
}

export function Part({ geo, mats, edges = true, ...rest }: { geo: THREE.BufferGeometry; mats: Mats; edges?: boolean } & Omit<ThreeElements["group"], "children">) {
  const edgeGeo = useMemo(() => (edges ? new THREE.EdgesGeometry(geo, 30) : null), [geo, edges]);
  return (
    <group {...rest}>
      <mesh geometry={geo} material={mats.solid} />
      <mesh geometry={geo} material={mats.wire} />
      {edgeGeo && <lineSegments geometry={edgeGeo} material={mats.line} />}
    </group>
  );
}

/** Texture de mesh technique : trous en losanges. */
function diamondTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.strokeStyle = "#fff";
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(64, 4);
  g.lineTo(124, 64);
  g.lineTo(64, 124);
  g.lineTo(4, 64);
  g.closePath();
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 9);
  t.anisotropy = 4;
  return t;
}

/** Logo « S » gravé sur la face du boîtier. */
function logoTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.font = "600 190px system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("S", 128, 140);
  return new THREE.CanvasTexture(c);
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Positions des pièces : dans le sac (fermé) → vue éclatée.
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const POS = {
  encoder: { in: V(0, 0.22, 0.04), out: V(0.72, 0.62, 0.55) },
  starlink: { in: V(0, 0, -0.16), out: V(-0.78, 0.5, -0.55) },
  batA: { in: V(-0.2, -0.38, 0.06), out: V(-0.82, -0.72, 0.4) },
  batB: { in: V(0.2, -0.38, 0.06), out: V(-0.46, -0.86, 0.55) },
};

type Align = "above" | "below" | "left";
const LABELS: { key: string; text: string; at: THREE.Vector3; align: Align }[] = [
  { key: "encoder", text: "ENCODEUR SYXTEE · 4G/5G BONDING", at: V(0, -0.3, 0), align: "below" },
  { key: "hdmi", text: "ENTRÉE CAMÉRA HDMI", at: V(0.27, 0.06, 0), align: "left" },
  { key: "usb", text: "PORT IPHONE USB-C", at: V(0.27, -0.08, 0), align: "left" },
  { key: "starlink", text: "COMPARTIMENT STARLINK MINI", at: V(0, 0.58, 0), align: "above" },
  { key: "power", text: "ÉNERGIE · 2 BATTERIES USB-C", at: V(0.18, -0.26, 0), align: "below" },
];

/** Reflets subtils : environnement studio procédural (aucun fichier HDR à télécharger). */
function useStudioEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    setEnvironment(scene, env);
    return () => {
      setEnvironment(scene, null);
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
}
function setEnvironment(scene: THREE.Scene, env: THREE.Texture | null) {
  scene.environment = env;
  scene.environmentIntensity = 0.35;
}

const tmp = new THREE.Vector3();
/** Place une légende HTML sur la projection écran de son ancre 3D. */
/** Place une légende HTML sur la projection écran de son ancre 3D, sans jamais sortir du cadre (mobile). */
function placeLabel(el: HTMLDivElement, anchor: THREE.Object3D, camera: THREE.Camera, w: number, h: number, align: Align, opacity: number) {
  anchor.getWorldPosition(tmp).project(camera);
  const x = ((tmp.x + 1) / 2) * w;
  const y = ((1 - tmp.y) / 2) * h;
  const lw = el.offsetWidth;
  const lh = el.offsetHeight;
  const left = align === "left" ? x + 6 : x - lw / 2;
  const top = align === "above" ? y - lh : align === "below" ? y : y - lh / 2;
  const cx = Math.min(Math.max(4, left), w - lw - 4);
  const cy = Math.min(Math.max(4, top), h - lh - 4);
  el.style.opacity = String(opacity);
  el.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
}

/** Vue plus reculée quand la zone est étroite (portrait) : le modèle éclaté tient toujours dans le cadre. */
function fit(cam: THREE.PerspectiveCamera, w: number, h: number) {
  cam.zoom = Math.min(1, (w / h) * 1.05);
  cam.updateProjectionMatrix();
}

function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => fit(camera as THREE.PerspectiveCamera, size.width, size.height), [camera, size]);
  return null;
}

/** Matériaux du mesh et du logo : blancs en squelette, gris discrets en plein. */
function applyTextures(mesh: THREE.MeshBasicMaterial, logo: THREE.MeshBasicMaterial, full: number, ex: number) {
  mesh.color.setScalar(lerp(1, 0.22, full));
  mesh.opacity = lerp(0.42, 0.9, full) * (1 - 0.6 * ex);
  logo.color.setScalar(lerp(1, 0.35, full));
}

/** Géométries, textures et matériaux du modèle (partagés avec le teaser de l'accueil). Libérés au démontage. */
export function useProKit() {
  const r = useMemo(() => {
    const bagShape = roundedRect(0.82, 0.92, 0.16);
    const mesh = diamondTexture();
    const logo = logoTexture();
    const strap = (side: 1 | -1) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([V(0.28 * side, 0.66, -0.26), V(0.36 * side, 0.3, -0.5), V(0.4 * side, -0.25, -0.46), V(0.42 * side, -0.62, -0.26)]),
        40,
        0.035,
        8,
      );
    return {
      mats: {
        bag: makeMats("#161616", 0.7, 0.1),
        part: makeMats("#1a1a1a", 0.35, 0.55),
        panel: makeMats("#1c1c1c", 0.25, 0.7),
      },
      meshMat: new THREE.MeshBasicMaterial({ map: mesh, transparent: true, depthWrite: false, color: "#ffffff" }),
      logoMat: new THREE.MeshBasicMaterial({ map: logo, transparent: true, depthWrite: false }),
      ledMat: new THREE.MeshBasicMaterial({ color: "#ff3b30" }),
      geo: {
        bag: new RoundedBoxGeometry(1.1, 1.5, 0.52, 4, 0.2),
        flap: new THREE.ShapeGeometry(bagShape, 6),
        flapEdge: new THREE.EdgesGeometry(new THREE.ShapeGeometry(bagShape, 6)),
        strapL: strap(-1),
        strapR: strap(1),
        handle: new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.16, 0.74, -0.08), V(0, 0.88, -0.08), V(0.16, 0.74, -0.08)]), 20, 0.022, 6),
        encoder: new RoundedBoxGeometry(0.46, 0.46, 0.16, 3, 0.06),
        vent: new THREE.BoxGeometry(0.26, 0.012, 0.01),
        hdmi: new THREE.BoxGeometry(0.02, 0.05, 0.1),
        usb: new RoundedBoxGeometry(0.02, 0.03, 0.07, 2, 0.008),
        antenna: new THREE.CylinderGeometry(0.014, 0.018, 0.26, 10),
        led: new THREE.SphereGeometry(0.014, 12, 12),
        logo: new THREE.PlaneGeometry(0.16, 0.16),
        starlink: new RoundedBoxGeometry(0.86, 1.02, 0.045, 3, 0.03),
        battery: new RoundedBoxGeometry(0.17, 0.4, 0.08, 3, 0.03),
        batteryPort: new RoundedBoxGeometry(0.06, 0.012, 0.03, 2, 0.005),
      },
    };
  }, []);

  useEffect(
    () => () => {
      Object.values(r.geo).forEach((g) => g.dispose());
      Object.values(r.mats).forEach((m) => Object.values(m).forEach((x) => x.dispose()));
      r.meshMat.map?.dispose();
      r.logoMat.map?.dispose();
      [r.meshMat, r.logoMat, r.ledMat].forEach((m) => m.dispose());
    },
    [r],
  );

  return r;
}

export type ProKit = ReturnType<typeof useProKit>;

function Model({ p, labels }: { p: MotionValue<number>; labels: RefObject<(HTMLDivElement | null)[]> }) {
  const root = useRef<THREE.Group>(null);
  const enc = useRef<THREE.Group>(null);
  const star = useRef<THREE.Group>(null);
  const batA = useRef<THREE.Group>(null);
  const batB = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const anchors = useRef<(THREE.Object3D | null)[]>([]);
  const spin = useRef(0.6);

  const r = useProKit();

  useStudioEnv();

  useFrame((state, dt) => {
    const v = p.get();
    const ex = easeOut(band(v, ...TL.explode));
    const full = ramp(v, ...TL.full);
    // Pose de 3/4 face pendant la vue éclatée (S2) et le prix (S4).
    const settle = Math.max(band(v, ...TL.settle), ramp(v, ...TL.settleEnd));
    const lab = band(v, ...TL.labels);

    // Rotation lente, qui se pose de 3/4 pendant la vue éclatée.
    spin.current += Math.min(dt, 0.1) * 0.32;
    const fixed = -0.5;
    const d = Math.atan2(Math.sin(spin.current - fixed), Math.cos(spin.current - fixed));
    if (root.current) {
      root.current.rotation.y = fixed + d * (1 - settle);
      root.current.rotation.x = lerp(0.06, 0.16, settle);
      root.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.025 * (1 - settle);
      const s = lerp(1, 0.9, ex);
      root.current.scale.setScalar(s);
    }

    enc.current?.position.lerpVectors(POS.encoder.in, POS.encoder.out, ex);
    star.current?.position.lerpVectors(POS.starlink.in, POS.starlink.out, ex);
    batA.current?.position.lerpVectors(POS.batA.in, POS.batA.out, ex);
    batB.current?.position.lerpVectors(POS.batB.in, POS.batB.out, ex);
    if (flap.current) flap.current.rotation.x = ex * 1.15;

    applyMode(r.mats.bag, full, 1 - 0.75 * ex, 0.07);
    applyMode(r.mats.part, full);
    applyMode(r.mats.panel, full);
    applyTextures(r.meshMat, r.logoMat, full, ex);

    const { camera, size } = state;
    LABELS.forEach((l, i) => {
      const el = labels.current[i];
      const a = anchors.current[i];
      if (el && a) placeLabel(el, a, camera, size.width, size.height, l.align, clamp01(lab));
    });
  });

  const label = (i: number) => (
    <object3D
      position={LABELS[i].at}
      ref={(o) => {
        anchors.current[i] = o;
      }}
    />
  );

  const { geo, mats } = r;
  return (
    <group ref={root}>
      {/* Sac */}
      <Part geo={geo.bag} mats={mats.bag} />
      <Part geo={geo.strapL} mats={mats.bag} edges={false} />
      <Part geo={geo.strapR} mats={mats.bag} edges={false} />
      <Part geo={geo.handle} mats={mats.bag} edges={false} />
      {/* Poche avant en mesh : pivote sur son bord bas quand le sac s'ouvre */}
      <group ref={flap} position={[0, -0.61, 0.265]}>
        <group position={[0, 0.46, 0]}>
          <mesh geometry={geo.flap} material={mats.bag.solid} />
          <mesh geometry={geo.flap} material={r.meshMat} position={[0, 0, 0.002]} />
          <lineSegments geometry={geo.flapEdge} material={mats.bag.line} position={[0, 0, 0.003]} />
        </group>
      </group>

      {/* Boîtier encodeur : grille d'aération, LED de statut, logo S, ports sur le côté, antennes */}
      <group ref={enc}>
        <Part geo={geo.encoder} mats={mats.part} />
        {[0, 1, 2, 3, 4].map((k) => (
          <Part key={k} geo={geo.vent} mats={mats.part} edges={false} position={[0, -0.08 - k * 0.028, 0.081]} />
        ))}
        <mesh geometry={geo.logo} material={r.logoMat} position={[0, 0.07, 0.082]} />
        <mesh geometry={geo.led} material={r.ledMat} position={[0.17, 0.17, 0.08]} />
        <Part geo={geo.hdmi} mats={mats.part} position={[0.235, 0.06, 0]} />
        <Part geo={geo.usb} mats={mats.part} position={[0.235, -0.08, 0]} />
        <Part geo={geo.antenna} mats={mats.part} position={[-0.16, 0.36, -0.02]} rotation={[0, 0, 0.22]} />
        <Part geo={geo.antenna} mats={mats.part} position={[0.16, 0.36, -0.02]} rotation={[0, 0, -0.22]} />
        {label(0)}
        {label(1)}
        {label(2)}
      </group>

      {/* Compartiment Starlink Mini (panneau plat dans le dos) */}
      <group ref={star}>
        <Part geo={geo.starlink} mats={mats.panel} />
        {label(3)}
      </group>

      {/* 2 batteries USB-C */}
      <group ref={batA}>
        <Part geo={geo.battery} mats={mats.part} />
        <Part geo={geo.batteryPort} mats={mats.part} edges={false} position={[0, 0.2, 0]} />
      </group>
      <group ref={batB}>
        <Part geo={geo.battery} mats={mats.part} />
        <Part geo={geo.batteryPort} mats={mats.part} edges={false} position={[0, 0.2, 0]} />
        {label(4)}
      </group>
    </group>
  );
}

/** Canvas plein cadre, transparent (le fond noir et le défilé de lieux sont en HTML derrière), et calque des légendes. */
export default function ProScene3D({ p, active }: { p: MotionValue<number>; active: boolean }) {
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0.15, 5.2], fov: 35 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ pointerEvents: "none" }}
        aria-hidden="true"
      >
        <FitCamera />
        <ambientLight intensity={0.3} />
        {/* Key light (avant, en haut à droite) + rim light blanc (arrière) */}
        <directionalLight position={[3, 4, 5]} intensity={3} />
        <directionalLight position={[-3.5, 2, -4]} intensity={4} />
        <directionalLight position={[4, -1, -3]} intensity={1.5} />
        <Model p={p} labels={labels} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {LABELS.map((l, i) => (
          <div
            key={l.key}
            ref={(el) => {
              labels.current[i] = el;
            }}
            style={{ opacity: 0 }}
            className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-accent/35 bg-background/80 px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] text-foreground sm:text-[10px]"
          >
            {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}
