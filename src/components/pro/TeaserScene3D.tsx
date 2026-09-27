"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { clamp01, lerp } from "@/components/story/timeline";
import { applyMode, Part, useProKit, V, type ProKit } from "./ProScene3D";

// Teaser de l'accueil : le modèle procédural du SYXTEE PRO, UNIQUEMENT en squelette (filaire blanc), filmé comme une
// bande-annonce. Boucle de 16 s en 5 plans rapprochés (3,2 s chacun), fondus au noir de 0,4 s entre deux plans.
// Tout est piloté dans useFrame (caméra, visibilité, calques HTML) : aucun re-render React pendant la lecture.

export const SHOT = 3.2;
const SHOTS = 5;
export const LOOP = SHOT * SHOTS;
const FADE = 0.2; // 0,2 s de fondu sortant + 0,2 s de fondu entrant = 0,4 s au noir
const FPS = 25;

type Cam = { pos: THREE.Vector3; at: THREE.Vector3 };
// Caméra de chaque plan : départ → arrivée (travelling lent).
const CAMS: { from: Cam; to: Cam }[] = [
  // 1. Texture mesh en losanges de la poche avant, travelling latéral
  { from: { pos: V(-0.26, 0.02, 1.45), at: V(-0.2, -0.02, 0.27) }, to: { pos: V(0.2, -0.26, 1.45), at: V(0.26, -0.3, 0.27) } },
  // 2. Coin du boîtier encodeur : grille d'aération + LED
  { from: { pos: V(0.66, 0.42, 0.78), at: V(0.12, 0.04, 0.06) }, to: { pos: V(0.54, 0.3, 0.66), at: V(0.12, 0.02, 0.06) } },
  // 3. Ports sur le côté (HDMI, USB-C)
  { from: { pos: V(0.95, 0.1, 0.22), at: V(0.235, -0.01, 0) }, to: { pos: V(0.85, 0.02, 0.06), at: V(0.235, -0.01, 0) } },
  // 4. Compartiment dans le dos : le panneau plat glisse
  { from: { pos: V(0.7, 1.05, -1.3), at: V(0.12, 0.6, -0.16) }, to: { pos: V(0.46, 0.92, -1.12), at: V(0.1, 0.58, -0.16) } },
  // 5. Silhouette de profil en contre-jour
  { from: { pos: V(-2.8, 0.16, 0.34), at: V(0, 0.06, -0.08) }, to: { pos: V(-2.8, 0.1, -0.26), at: V(0, 0.06, -0.08) } },
];

const smooth = (k: number) => k * k * (3 - 2 * k);
const pad = (n: number) => String(n).padStart(2, "0");

/** Calques HTML pilotés image par image (remplis par des refs callback dans ProTeaser). */
export type TeaserEls = {
  fade: HTMLDivElement | null;
  glow: HTMLDivElement | null;
  timecode: HTMLSpanElement | null;
  label: HTMLDivElement | null;
  labelText: HTMLSpanElement | null;
};

const LABELS: Record<number, string> = { 2: "ENTRÉE CAMÉRA", 3: "STARLINK READY" };
const LED_OFF = new THREE.Color("#2a2a2a");
const LED_ON = new THREE.Color("#ff3b30");
const tmp = new THREE.Vector3();
const look = new THREE.Vector3();

type Nodes = {
  bag: THREE.Group | null;
  enc: THREE.Group | null;
  star: THREE.Group | null;
  silhouette: THREE.Group | null;
  hdmi: THREE.Object3D | null;
  panelCorner: THREE.Object3D | null;
};
type Clock = { time: number; tc: string; typed: number };
type Sil = ReturnType<typeof makeSil>;

function makeSil(r: ProKit) {
  const near = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const far = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  return {
    near,
    far,
    occluder: new THREE.MeshBasicMaterial({ color: "#000000", polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    rim: new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.3, depthWrite: false }),
    sweep: new THREE.LineBasicMaterial({ color: "#ffffff", clippingPlanes: [near, far] }),
    sweepWire: new THREE.MeshBasicMaterial({ color: "#ffffff", wireframe: true, transparent: true, opacity: 0.55, clippingPlanes: [near, far] }),
    edges: new THREE.EdgesGeometry(r.geo.bag, 10), // seuil bas : les arrondis dessinent le contour
  };
}

/** Une image de la boucle : caméra, visibilité des pièces, matériaux et calques HTML. */
function tick({ camera, size }: RootState, dt: number, r: ProKit, sil: Sil, n: Nodes, st: Clock, ui: TeaserEls) {
  const t = (st.time = (st.time + Math.min(dt, 0.1)) % LOOP);
  const i = Math.min(SHOTS - 1, Math.floor(t / SHOT));
  const lt = t - i * SHOT;
  const e = smooth(lt / SHOT);

  // Caméra (recul léger en portrait pour garder le sujet dans le cadre)
  const cam = camera as THREE.PerspectiveCamera;
  const zoom = Math.min(1, (size.width / size.height) * 1.3);
  if (Math.abs(cam.zoom - zoom) > 0.001) {
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
  }
  // Sujet décalé à droite en paysage (le texte est en bas à gauche), vers le haut en portrait.
  const ox = size.width > size.height * 1.2 ? -Math.round(size.width * 0.16) : 0;
  const oy = size.width < size.height ? Math.round(size.height * 0.14) : 0;
  const v = cam.view;
  if (!v || v.offsetX !== ox || v.offsetY !== oy || v.fullWidth !== size.width || v.fullHeight !== size.height) {
    cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height);
  }
  const c = CAMS[i];
  cam.position.lerpVectors(c.from.pos, c.to.pos, e);
  cam.lookAt(look.lerpVectors(c.from.at, c.to.at, e));

  // Qui est à l'image
  if (n.bag) n.bag.visible = i === 0 || i === 3;
  if (n.enc) n.enc.visible = i === 1 || i === 2;
  if (n.star) n.star.visible = i === 3;
  if (n.silhouette) n.silhouette.visible = i === 4;

  // Squelette uniquement (full = 0) : seules les intensités du filaire changent selon le plan.
  applyMode(r.mats.bag, 0, i === 0 ? 0.3 : 0.55, 0.07);
  applyMode(r.mats.part, 0, 1, 0.08);
  applyMode(r.mats.panel, 0, 1, 0.1);
  r.meshMat.color.setScalar(1);
  r.meshMat.opacity = i === 0 ? 0.55 : 0.35;
  r.logoMat.color.setScalar(1);

  // Plan 2 : la LED s'allume en rouge « live » au premier tiers
  r.ledMat.color.copy(i === 1 && lt > SHOT * 0.35 ? LED_ON : LED_OFF);

  // Plan 4 : le panneau Starlink glisse hors du compartiment
  if (n.star) n.star.position.set(0, lerp(-0.12, 0.42, smooth(clamp01((lt - 0.3) / 2.2))), -0.16);

  // Plan 5 : la bande de lumière balaie le profil d'avant en arrière
  const z = lerp(0.62, -0.86, clamp01(lt / (SHOT - 0.3)));
  sil.near.constant = -(z - 0.07);
  sil.far.constant = z + 0.07;
  if (ui.glow) ui.glow.style.opacity = i === 4 ? String(0.4 + 0.6 * smooth(clamp01(lt / 1.2))) : "0";

  // Fondu au noir entre deux plans
  const fade = Math.max(0, 1 - lt / FADE, 1 - (SHOT - lt) / FADE);
  if (ui.fade) ui.fade.style.opacity = fade.toFixed(3);

  // Timecode HH:MM:SS:FF
  const f = Math.floor(t * FPS);
  const tc = `00:00:${pad(Math.floor(f / FPS))}:${pad(f % FPS)}`;
  if (tc !== st.tc && ui.timecode) {
    ui.timecode.textContent = tc;
    st.tc = tc;
  }

  // Label mono qui s'écrit lettre par lettre (plans 3 et 4), accroché à son point 3D
  const text = LABELS[i];
  const box = ui.label;
  const span = ui.labelText;
  if (box && span) {
    const anchor = i === 2 ? n.hdmi : i === 3 ? n.panelCorner : null;
    if (!text || !anchor) {
      box.style.opacity = "0";
      st.typed = -1;
    } else {
      const count = Math.floor(clamp01((lt - 0.5) / 1.1) * text.length);
      if (count !== st.typed) {
        span.textContent = text.slice(0, count);
        st.typed = count;
      }
      anchor.getWorldPosition(tmp).project(camera);
      const x = ((tmp.x + 1) / 2) * size.width;
      const y = ((1 - tmp.y) / 2) * size.height;
      const lx = Math.min(Math.max(8, x + 14), size.width - box.offsetWidth - 8);
      const ly = Math.min(Math.max(8, y - box.offsetHeight / 2), size.height - box.offsetHeight - 8);
      box.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
      box.style.opacity = count > 0 ? String(1 - fade) : "0";
    }
  }
}

function Teaser({ ui }: { ui: RefObject<TeaserEls> }) {
  const r = useProKit();

  // Plan 5 : cache noir (le contre-jour découpe la forme) + bande de lumière qui balaie le contour (plans de coupe).
  const sil = useMemo(() => makeSil(r), [r]);
  useEffect(
    () => () => {
      [sil.occluder, sil.rim, sil.sweep, sil.sweepWire].forEach((m) => m.dispose());
      sil.edges.dispose();
    },
    [sil],
  );

  const nodes = useRef<Nodes>({ bag: null, enc: null, star: null, silhouette: null, hdmi: null, panelCorner: null });
  const clock = useRef<Clock>({ time: 0, tc: "", typed: -1 });
  useFrame((state, dt) => tick(state, dt, r, sil, nodes.current, clock.current, ui.current));

  const { geo, mats } = r;
  return (
    <>
      {/* Plans 1 et 4 : sac + poche avant en mesh */}
      <group ref={(o) => void (nodes.current.bag = o)}>
        <Part geo={geo.bag} mats={mats.bag} />
        <Part geo={geo.strapL} mats={mats.bag} edges={false} />
        <Part geo={geo.strapR} mats={mats.bag} edges={false} />
        <Part geo={geo.handle} mats={mats.bag} edges={false} />
        <group position={[0, -0.15, 0.265]}>
          <mesh geometry={geo.flap} material={r.meshMat} position={[0, 0, 0.002]} />
          <lineSegments geometry={geo.flapEdge} material={mats.bag.line} position={[0, 0, 0.003]} />
        </group>
      </group>

      {/* Plans 2 et 3 : boîtier encodeur seul */}
      <group ref={(o) => void (nodes.current.enc = o)}>
        <Part geo={geo.encoder} mats={mats.part} />
        {[0, 1, 2, 3, 4].map((k) => (
          <Part key={k} geo={geo.vent} mats={mats.part} edges={false} position={[0, -0.08 - k * 0.028, 0.081]} />
        ))}
        <mesh geometry={geo.logo} material={r.logoMat} position={[0, 0.07, 0.082]} />
        <mesh geometry={geo.led} material={r.ledMat} position={[0.17, 0.17, 0.08]} scale={0.6} />
        <Part geo={geo.hdmi} mats={mats.part} position={[0.235, 0.06, 0]} />
        <Part geo={geo.usb} mats={mats.part} position={[0.235, -0.08, 0]} />
        <Part geo={geo.antenna} mats={mats.part} position={[-0.16, 0.36, -0.02]} rotation={[0, 0, 0.22]} />
        <Part geo={geo.antenna} mats={mats.part} position={[0.16, 0.36, -0.02]} rotation={[0, 0, -0.22]} />
        <object3D ref={(o) => void (nodes.current.hdmi = o)} position={[0.25, 0.06, 0]} />
      </group>

      {/* Plan 4 : panneau Starlink Mini */}
      <group ref={(o) => void (nodes.current.star = o)}>
        <Part geo={geo.starlink} mats={mats.panel} />
        <object3D ref={(o) => void (nodes.current.panelCorner = o)} position={[0.3, 0.51, 0]} />
      </group>

      {/* Plan 5 : silhouette de profil (contour seul) */}
      <group ref={(o) => void (nodes.current.silhouette = o)}>
        <mesh geometry={geo.bag} material={sil.occluder} />
        <mesh geometry={geo.strapL} material={sil.occluder} />
        <mesh geometry={geo.strapR} material={sil.occluder} />
        <mesh geometry={geo.handle} material={sil.occluder} />
        <lineSegments geometry={sil.edges} material={sil.rim} />
        <lineSegments geometry={sil.edges} material={sil.sweep} />
        <mesh geometry={geo.strapL} material={sil.sweepWire} />
        <mesh geometry={geo.strapR} material={sil.sweepWire} />
        <mesh geometry={geo.handle} material={sil.sweepWire} />
      </group>
    </>
  );
}

/** Canvas transparent (fond noir en HTML derrière), en pause quand `active` est faux. */
export default function TeaserScene3D({ active, ui }: { active: boolean; ui: RefObject<TeaserEls> }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 1], fov: 35, near: 0.05, far: 20 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Teaser ui={ui} />
    </Canvas>
  );
}
