import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Dioramas 3D de « Il marche n'importe où » : bateau, hélicoptère, montagne, marathon, désert, foule.
// Même langage que l'Encodeur 3D : tuile sombre, matières mates et métalliques, éclairage de studio, ombres douces.
// Chaque scène contient le vrai Encodeur (dalle basse, barre lumineuse) ; la seule couleur est sa LED rouge « en direct ».

export type SceneKind = 'boat' | 'heli' | 'mountain' | 'marathon' | 'desert' | 'crowd';
export interface SceneHandle { setActive(a: boolean): void; dispose(): void }

type Anim = (t: number, dt: number) => void;
type Mats = ReturnType<typeof makeMats>;

const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Panneau solaire Starlink : six segments, cellules quadrillées, filets blancs, petits trous de fixation. */
function solarTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 256, 1024); g.addColorStop(0, '#7f8db3'); g.addColorStop(0.5, '#a9b4d2'); g.addColorStop(1, '#6f7fa8');
  x.fillStyle = g; x.fillRect(0, 0, 256, 1024);
  x.strokeStyle = 'rgba(235,240,255,0.55)'; x.lineWidth = 1;
  for (let i = 0; i <= 256; i += 8) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 1024); x.stroke(); }
  for (let j = 0; j <= 1024; j += 8) { x.beginPath(); x.moveTo(0, j); x.lineTo(256, j); x.stroke(); }
  x.strokeStyle = '#f2f4fb'; x.lineWidth = 4;
  for (let k = 0; k <= 6; k++) { const y = (k * 1024) / 6; x.beginPath(); x.moveTo(0, y); x.lineTo(256, y); x.stroke(); }
  x.strokeRect(2, 2, 252, 1020);
  x.fillStyle = '#10131a';
  for (let k = 0; k < 6; k++) { x.beginPath(); x.arc(78, (k + 0.5) * (1024 / 6), 6, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Écran LED de la scène : dégradé chaud et formes lumineuses, comme un concert. */
function screenTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 220;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 512, 220); g.addColorStop(0, '#32211c'); g.addColorStop(0.5, '#8a5a3a'); g.addColorStop(1, '#2c2330');
  x.fillStyle = g; x.fillRect(0, 0, 512, 220);
  for (const [px, col] of [[130, '#ffe4b8'], [256, '#fff4e0'], [380, '#ffd9a0']] as [number, string][]) {
    x.fillStyle = col; x.beginPath(); x.ellipse(px, 118, 26, 84, 0, 0, 7); x.fill();
    x.fillStyle = '#e8c9a0'; x.beginPath(); x.arc(px, 42, 20, 0, 7); x.fill();
  }
  x.fillStyle = 'rgba(0,0,0,0.14)'; for (let i = 0; i < 220; i += 4) x.fillRect(0, i, 512, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeMats() {
  return {
    plinth: new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.45, metalness: 0.7 }),
    ground: new THREE.MeshStandardMaterial({ color: 0x24262b, roughness: 0.85, metalness: 0.1 }),
    sand: new THREE.MeshStandardMaterial({ color: 0x55575d, roughness: 0.95, metalness: 0.02 }),
    rock: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.05, vertexColors: true, flatShading: true }),
    sea: new THREE.MeshStandardMaterial({ color: 0x2c313b, roughness: 0.28, metalness: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1f2024, roughness: 0.5, metalness: 0.5 }),
    mid: new THREE.MeshStandardMaterial({ color: 0x4a4c53, roughness: 0.55, metalness: 0.35 }),
    light: new THREE.MeshStandardMaterial({ color: 0x9a9da5, roughness: 0.5, metalness: 0.3 }),
    sail: new THREE.MeshStandardMaterial({ color: 0xb9bcc3, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: 0xc4c7ce, roughness: 0.28, metalness: 0.95 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.06, metalness: 0.9, transparent: true, opacity: 0.4 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.3, metalness: 0.8 }),
    solar: new THREE.MeshStandardMaterial({ map: solarTexture(), roughness: 0.22, metalness: 0.65, side: THREE.DoubleSide, envMapIntensity: 1.6 }),
    heliBody: new THREE.MeshStandardMaterial({ color: 0x3a4152, roughness: 0.25, metalness: 0.7 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xe9ebef, roughness: 0.35, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.8, metalness: 0.1 }),
    screen: new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }),
    warm: new THREE.MeshBasicMaterial({ color: 0xffc766, toneMapped: false }),
    stand: new THREE.MeshStandardMaterial({ color: 0x2b2d33, roughness: 0.8, metalness: 0.1 }),
    pine: new THREE.MeshStandardMaterial({ color: 0x2c2f35, roughness: 0.9, metalness: 0 }),
    skin: new THREE.MeshStandardMaterial({ color: 0x9a9da5, roughness: 0.7, metalness: 0.05 }),
    body: new THREE.MeshStandardMaterial({ color: 0x585b62, roughness: 0.75, metalness: 0.05 }),
    led: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3b30, emissiveIntensity: 3, roughness: 0.4 }),
    sun: new THREE.MeshBasicMaterial({ color: 0xf1f2f5 }),
    beam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide }),
    link: new THREE.LineDashedMaterial({ color: 0xe6e8ec, dashSize: 0.28, gapSize: 0.22, transparent: true, opacity: 0.75 }),
  };
}

function put<T extends THREE.Object3D>(parent: THREE.Object3D, o: T, x = 0, y = 0, z = 0): T {
  o.position.set(x, y, z);
  o.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  parent.add(o);
  return o;
}
const mesh = (g: THREE.BufferGeometry, m: THREE.Material) => new THREE.Mesh(g, m);

/** Le boîtier SYXTEE : dalle basse, arêtes arrondies, barre lumineuse en façade (+x). */
function unit(M: Mats, s = 1) {
  const g = new THREE.Group();
  g.add(mesh(new RoundedBoxGeometry(1.2, 0.3, 0.8, 4, 0.1), M.dark));
  const bar = mesh(new THREE.BoxGeometry(0.02, 0.05, 0.42), M.led); bar.position.set(0.61, -0.02, 0); g.add(bar);
  const top = mesh(new THREE.BoxGeometry(0.5, 0.012, 0.012), M.metal); top.position.set(-0.1, 0.152, 0); g.add(top);
  g.scale.setScalar(s);
  return g;
}

function dish(M: Mats, s = 1) {
  const g = new THREE.Group();
  const bowl = mesh(new THREE.SphereGeometry(0.62, 32, 12, 0, Math.PI * 2, 0, 0.72), M.light); bowl.material = M.light;
  bowl.rotation.x = Math.PI; bowl.position.y = 0.42; bowl.rotation.z = 0.6;
  g.add(bowl);
  const arm = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), M.metal); arm.position.set(0.15, 0.78, 0); arm.rotation.z = -0.55; g.add(arm);
  for (const a of [0, 2.1, 4.2]) {
    const leg = mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), M.metal);
    leg.position.set(Math.cos(a) * 0.22, 0.0, Math.sin(a) * 0.22);
    leg.rotation.set(Math.sin(a) * 0.38, 0, -Math.cos(a) * 0.38);
    g.add(leg);
  }
  g.scale.setScalar(s);
  return g;
}

/** Satellite Starlink : châssis plat noir, un seul grand panneau solaire quadrillé (réf. photo). Panneau le long de +y. */
function satellite(M: Mats, s = 1) {
  const g = new THREE.Group();
  const body = mesh(new RoundedBoxGeometry(1.5, 0.2, 0.7, 3, 0.04), M.rubber); g.add(body);
  const plate = mesh(new THREE.BoxGeometry(1.1, 0.04, 0.5), M.dark); plate.position.set(0.1, 0.12, 0); g.add(plate);
  const arr = mesh(new THREE.PlaneGeometry(1.25, 5.2), M.solar); arr.position.set(-0.15, 2.9, 0); g.add(arr);
  const rim = mesh(new THREE.BoxGeometry(1.3, 0.05, 0.05), M.metal); rim.position.set(-0.15, 0.3, 0); g.add(rim);
  for (const sx of [-0.6, 0.6]) { const st = mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), M.metal); st.position.set(-0.15 + sx, 0.22, 0); g.add(st); }
  g.rotation.set(0.35, 0.5, -0.32);
  const out = new THREE.Group(); out.add(g); out.scale.setScalar(s);
  return out;
}

function tower(M: Mats, h = 3.4) {
  const g = new THREE.Group();
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const l = mesh(new THREE.CylinderGeometry(0.02, 0.05, h, 6), M.metal);
    l.position.set(x * (1 - 0.6 * 0), h / 2, z);
    l.rotation.set(z * 0.1, 0, -x * 0.1);
    g.add(l);
  }
  for (let i = 1; i < 6; i++) {
    const y = (h * i) / 6, w = 0.34 - i * 0.04;
    const b = mesh(new THREE.BoxGeometry(w * 2, 0.02, 0.02), M.metal); b.position.y = y; g.add(b);
    const b2 = mesh(new THREE.BoxGeometry(0.02, 0.02, w * 2), M.metal); b2.position.y = y; g.add(b2);
  }
  const ant = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.14), M.light); ant.position.y = h + 0.1; g.add(ant);
  const led = mesh(new THREE.SphereGeometry(0.07, 12, 8), M.led); led.position.y = h + 0.5; g.add(led);
  return g;
}

function person(M: Mats, h = 1.7) {
  const g = new THREE.Group();
  const body = mesh(new THREE.CapsuleGeometry(0.2, h * 0.34, 6, 12), M.body); body.position.y = h * 0.62;
  const head = mesh(new THREE.SphereGeometry(0.17, 16, 12), M.skin); head.position.y = h * 0.62 + h * 0.34 / 2 + 0.34;
  const legL = mesh(new THREE.CapsuleGeometry(0.075, h * 0.3, 4, 8), M.dark), legR = legL.clone();
  legL.position.set(0, h * 0.2, -0.09); legR.position.set(0, h * 0.2, 0.09);
  g.add(body, head, legL, legR);
  g.userData = { legL, legR };
  return g;
}

/** Airbus H125 (Écureuil) : cabine bulbeuse, grand pare-brise, bosse moteur, poutre de queue effilée, dérive et empennage, rotor 3 pales, patins. Nez vers +x. */
function h125(M: Mats) {
  const heli = new THREE.Group();
  const shell = (sx: number, sy: number, sz: number, x: number, y: number, z = 0) => { const m = put(heli, mesh(new THREE.SphereGeometry(1, 40, 28), M.heliBody), x, y, z); m.scale.set(sx, sy, sz); return m; };
  shell(1.75, 1.08, 1.0, 0.45, 0, 0);       // cabine
  shell(1.5, 0.95, 0.95, -0.9, 0.18, 0);    // arrière cabine
  shell(1.05, 0.55, 0.7, -0.7, 0.95, 0);    // capot moteur
  const gl = put(heli, mesh(new THREE.SphereGeometry(1.01, 40, 28, -1.15, 2.3, 0.28, 1.55), M.glass), 0.5, 0.02, 0); gl.scale.set(1.75, 1.08, 1.0);
  put(heli, mesh(new THREE.BoxGeometry(0.06, 0.5, 1.5), M.dark), 0.62, 0.15, 0).rotation.y = 0;
  // poutre de queue effilée
  const boom = put(heli, mesh(new THREE.CylinderGeometry(0.2, 0.52, 5.4, 24), M.heliBody), -4.1, 0.38, 0); boom.rotation.z = Math.PI / 2 - 0.02;
  // dérive verticale, empennage, aileron ventral
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(0.9, 0); fin.lineTo(0.55, 1.5); fin.lineTo(0.05, 1.4); fin.closePath();
  const finM = put(heli, mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.07, bevelEnabled: false }), M.heliBody), -7.05, 0.45, -0.035);
  const vent = new THREE.Shape(); vent.moveTo(0, 0); vent.lineTo(0.7, 0); vent.lineTo(0.35, -0.85); vent.closePath();
  put(heli, mesh(new THREE.ExtrudeGeometry(vent, { depth: 0.06, bevelEnabled: false }), M.heliBody), -6.9, 0.4, -0.03);
  put(heli, mesh(new THREE.BoxGeometry(0.75, 0.05, 1.35), M.heliBody), -5.9, 0.62, 0);
  void finM;
  // rotor de queue (côté droit)
  const tailRotor = new THREE.Group(); tailRotor.position.set(-6.7, 1.05, 0.2); heli.add(tailRotor);
  for (const a of [0, Math.PI]) { const bl = put(tailRotor, mesh(new THREE.BoxGeometry(0.08, 0.7, 0.03), M.dark), 0, 0, 0); bl.rotation.z = a; bl.position.set(0, a ? -0.35 : 0.35, 0); }
  // mât, moyeu, trois pales
  put(heli, mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.55, 14), M.metal), -0.45, 1.5, 0);
  const rotor = new THREE.Group(); rotor.position.set(-0.45, 1.8, 0); heli.add(rotor);
  put(rotor, mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.2, 16), M.dark));
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3, bl = put(rotor, mesh(new THREE.BoxGeometry(3.3, 0.035, 0.28), M.dark), Math.cos(a) * 1.7, 0.03, -Math.sin(a) * 1.7);
    bl.rotation.y = a; bl.rotation.z = 0.02;
  }
  // bandes de livrée
  for (const z of [-1, 1]) {
    put(heli, mesh(new THREE.BoxGeometry(3.4, 0.07, 0.015), M.stripe), -0.3, 0.12, z * 0.99).rotation.z = 0.05;
    put(heli, mesh(new THREE.BoxGeometry(2.3, 0.045, 0.015), M.stripe), -0.9, 0.0, z * 0.985);
  }
  // portes arrière, boîtier dans la soute
  const bay = new THREE.Group(); bay.position.set(-0.7, -0.15, 0); heli.add(bay);
  // patins : deux tubes, relevés à l'avant, deux traverses
  for (const z of [-0.95, 0.95]) {
    const sk = new THREE.Group();
    put(sk, mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.7, 10), M.rubber), 0, 0, 0).rotation.z = Math.PI / 2;
    put(sk, mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 10), M.rubber), 1.95, 0.2, 0).rotation.z = Math.PI / 2 + 0.7;
    sk.position.set(0, -1.52, z); heli.add(sk);
  }
  for (const x of [-0.55, 1.05]) {
    const cr = put(heli, mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.1, 8), M.metal), x, -1.28, 0); cr.rotation.x = Math.PI / 2;
    for (const z of [-0.95, 0.95]) { const lg = put(heli, mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 6), M.metal), x, -1.4, z * 0.97); lg.rotation.x = z * 0.1; }
  }
  // nacelle caméra gyrostabilisée sous le nez, antennes
  put(heli, mesh(new THREE.SphereGeometry(0.3, 20, 14), M.dark), 1.7, -0.78, 0);
  put(heli, mesh(new THREE.SphereGeometry(0.1, 12, 8), M.glass), 1.96, -0.78, 0);
  put(heli, mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 5), M.metal), -2.3, 1.0, 0.3);
  return { heli, rotor, tailRotor, bay };
}

function plinth(root: THREE.Group, M: Mats, w: number, d: number) {
  const p = mesh(new RoundedBoxGeometry(w + 0.7, 0.9, d + 0.7, 5, 0.18), M.plinth);
  p.position.y = -0.46; p.receiveShadow = true; root.add(p);
}

function terrain(w: number, d: number, seg: number, h: (x: number, z: number) => number, mat: THREE.Material, color?: (y: number) => THREE.Color) {
  const g = new THREE.PlaneGeometry(w, d, seg, Math.max(2, Math.round((seg * d) / w)));
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const cols = color ? new Float32Array(p.count * 3) : null;
  for (let i = 0; i < p.count; i++) {
    const y = h(p.getX(i), p.getZ(i));
    p.setY(i, y);
    if (cols && color) { const c = color(y); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  }
  if (cols) g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const m = mesh(g, mat); m.receiveShadow = true; m.castShadow = true;
  return m;
}

/** Trait pointillé entre deux objets (mis à jour à chaque image). */
function link(root: THREE.Group, M: Mats, a: THREE.Object3D, b: THREE.Object3D, anim: Anim[]) {
  const geo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 37 }, () => new THREE.Vector3()));
  const line = new THREE.Line(geo, M.link);
  line.frustumCulled = false;
  root.add(line);
  const va = new THREE.Vector3(), vb = new THREE.Vector3();
  const upd = () => {
    a.updateWorldMatrix(true, false); b.updateWorldMatrix(true, false);
    a.getWorldPosition(va); b.getWorldPosition(vb);
    const mid = va.clone().lerp(vb, 0.5); mid.y += va.distanceTo(vb) * 0.12;
    const pts = new THREE.QuadraticBezierCurve3(va.clone(), mid, vb.clone()).getPoints(36);
    geo.setFromPoints(pts); line.computeLineDistances();
  };
  upd();
  anim.push(upd);
}

/* ---------------------------------------------------------------- scènes */

function buildBoat(root: THREE.Group, M: Mats, anim: Anim[]) {
  const W = 22, D = 14;
  plinth(root, M, W, D);
  const seaGeo = new THREE.PlaneGeometry(W, D, 88, 56); seaGeo.rotateX(-Math.PI / 2);
  const sea = mesh(seaGeo, M.sea); sea.receiveShadow = true; root.add(sea);
  const sp = seaGeo.attributes.position; const base = Float32Array.from(sp.array as ArrayLike<number>);
  anim.push((t) => {
    for (let i = 0; i < sp.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      sp.setY(i, 0.14 * Math.sin(x * 0.8 + t * 1.2) + 0.1 * Math.sin(z * 1.1 + t * 0.9) + 0.05 * Math.sin((x + z) * 2.1 + t * 1.8));
    }
    sp.needsUpdate = true; seaGeo.computeVertexNormals();
  });

  const boat = new THREE.Group(); root.add(boat);
  // coque : profil latéral extrudé, rétréci vers l'étrave
  const s = new THREE.Shape();
  s.moveTo(4.2, 0.95); s.lineTo(-3.7, 0.95); s.lineTo(-3.4, -0.2); s.quadraticCurveTo(-1, -0.85, 1.6, -0.7); s.quadraticCurveTo(3.4, -0.5, 4.2, 0.95);
  const hullGeo = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 18 });
  hullGeo.translate(0, 0, -1.2);
  const hp = hullGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) { const x = hp.getX(i); hp.setZ(i, hp.getZ(i) * (1 - 0.78 * Math.pow(Math.max(0, x) / 4.3, 1.6))); }
  hullGeo.computeVertexNormals();
  put(boat, mesh(hullGeo, M.light), 0, 0.3, 0);
  put(boat, mesh(new THREE.BoxGeometry(7.6, 0.05, 2.0), M.mid), -0.1, 1.3, 0);
  put(boat, mesh(new RoundedBoxGeometry(1.6, 0.55, 1.0, 3, 0.12), M.dark), -1.3, 1.62, 0);
  for (const x of [-1.8, -1.3, -0.8]) put(boat, mesh(new THREE.BoxGeometry(0.28, 0.16, 1.02), M.glass), x, 1.7, 0);
  // mât, voiles
  put(boat, mesh(new THREE.CylinderGeometry(0.06, 0.08, 7.2, 12), M.metal), 0.9, 4.8, 0);
  const sail = (pts: [number, number][], x: number, bulge: number) => {
    const sh = new THREE.Shape(); sh.moveTo(...pts[0]); pts.slice(1).forEach((p) => sh.lineTo(...p));
    const g = new THREE.ShapeGeometry(sh, 10);
    const pp = g.attributes.position;
    for (let i = 0; i < pp.count; i++) { const px = pp.getX(i), py = pp.getY(i); pp.setZ(i, bulge * Math.sin((Math.PI * py) / 6.5) * Math.abs(px) / 3); }
    g.computeVertexNormals();
    return put(boat, mesh(g, M.sail), x, 1.4, 0.05);
  };
  const main = sail([[0, 0], [0, 6.4], [-3.4, 0.2]], 0.9, 0.5); main.rotation.y = 0;
  const jib = sail([[0, 0], [0, 5.6], [2.8, 0.1]], 0.9, -0.4);
  put(boat, mesh(new THREE.CylinderGeometry(0.04, 0.04, 3.5, 8), M.metal), -0.85, 1.5, 0).rotation.z = Math.PI / 2;
  void jib;
  // à bord : parabole, boîtier, satellite au-dessus, liaison
  const d = put(boat, dish(M, 1), -3.0, 1.35, 0.35);
  put(boat, unit(M, 1), 0.2, 1.48, 0.55);
  const sat = put(root, satellite(M, 0.7), 6.2, 7, -2.6);
  anim.push((t) => { sat.position.y = 7 + Math.sin(t * 0.8) * 0.15; sat.rotation.y = Math.sin(t * 0.3) * 0.18; boat.position.y = Math.sin(t * 1.1) * 0.12; boat.rotation.z = Math.sin(t * 0.9) * 0.025; boat.rotation.x = Math.sin(t * 0.7) * 0.02; });
  link(root, M, d, sat, anim);
  return { w: W, h: 11, cy: 3 };
}

function ridge(x: number, z: number) {
  return 3.6 * Math.exp(-((x + 5) ** 2 + (z + 1) ** 2) / 22) + 2.6 * Math.exp(-((x - 5) ** 2 + (z - 2) ** 2) / 16) +
    1.0 * Math.abs(Math.sin(x * 0.45 + 0.6) * Math.cos(z * 0.38)) + 0.5 * Math.sin(x * 1.3) * Math.sin(z * 1.1) * 0.5;
}

function buildMountain(root: THREE.Group, M: Mats, anim: Anim[], variant: 'mountain' | 'heli') {
  const W = 22, D = 14;
  plinth(root, M, W, D);
  const hf = (x: number, z: number) => (variant === 'heli' ? ridge(x, z) * 0.85 : ridge(x, z) * 1.25 + 0.5 * Math.exp(-((x - 1) ** 2 + (z - 4) ** 2) / 20));
  const snowAt = variant === 'heli' ? 3.0 : 4.2;
  const rock = new THREE.Color(0x30333a), mid = new THREE.Color(0x4a4d54), snow = new THREE.Color(0xb8bbc3);
  const t = terrain(W, D, 110, hf, M.rock, (y) => {
    if (y > snowAt) return snow.clone().lerp(mid, Math.max(0, 1 - (y - snowAt) / 0.9) * 0.4);
    if (y > snowAt - 1.2) return mid.clone().lerp(snow, (y - (snowAt - 1.2)) / 1.2);
    return rock.clone().lerp(mid, Math.min(1, y / (snowAt - 1.2)));
  });
  root.add(t);
  // sapins
  const r = rng(7);
  const pines = new THREE.InstancedMesh(new THREE.ConeGeometry(0.28, 1.0, 7), M.pine, 70);
  const m4 = new THREE.Matrix4(); let n = 0;
  for (let i = 0; i < 400 && n < 70; i++) {
    const x = (r() - 0.5) * (W - 1.5), z = (r() - 0.5) * (D - 1.5), y = hf(x, z);
    if (y > 0.5 && y < 2.4 && Math.abs(hf(x + 0.4, z) - hf(x - 0.4, z)) < 0.5) {
      const s = 0.8 + r() * 0.8; m4.compose(new THREE.Vector3(x, y + 0.5 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s)); pines.setMatrixAt(n++, m4);
    }
  }
  pines.count = n; pines.castShadow = true; root.add(pines);
  // antenne-relais sur la crête
  const tx = variant === 'heli' ? -7.2 : 7.0, tz = variant === 'heli' ? 1.5 : -3;
  const tw = put(root, tower(M, 2.8), tx, hf(tx, tz), tz);
  if (variant === 'mountain') {
    const hx = -1.5, hz = 4.2, hy = hf(hx, hz);
    const hiker = put(root, person(M, 1.2), hx, hy, hz);
    const bag = put(hiker, unit(M, 0.55), -0.28, 0.82, 0); bag.rotation.z = Math.PI / 2; bag.rotation.y = Math.PI / 2; bag.rotation.x = 0;
    anim.push((tm) => { hiker.position.y = hy + Math.abs(Math.sin(tm * 3)) * 0.04; });
    link(root, M, bag, tw, anim);
    return { w: W, h: 10, cy: 3 };
  }
  // Airbus H125 en vol stationnaire au-dessus de la crête
  const { heli, rotor, tailRotor, bay } = h125(M);
  root.add(heli);
  put(bay, unit(M, 0.55), 0, 0, 0);
  heli.scale.setScalar(1.35); heli.position.set(0.5, 5.6, 1.5); heli.rotation.y = -0.4;
  anim.push((tm, dt) => { rotor.rotation.y += dt * 30; tailRotor.rotation.z += dt * 36; heli.position.y = 5.6 + Math.sin(tm * 1.3) * 0.18; heli.rotation.z = Math.sin(tm * 0.9) * 0.03; heli.rotation.x = Math.sin(tm * 0.7) * 0.02; });
  link(root, M, heli, tw, anim);
  return { w: W, h: 12, cy: 4 };
}

function buildMarathon(root: THREE.Group, M: Mats, anim: Anim[]) {
  const W = 22, D = 16;
  plinth(root, M, W, D);
  const g = mesh(new THREE.BoxGeometry(W, 0.1, D), M.ground); g.position.y = -0.05; g.receiveShadow = true; root.add(g);
  const road = mesh(new THREE.BoxGeometry(5, 0.06, D), M.mid); road.position.y = 0.03; road.receiveShadow = true; root.add(road);
  for (let z = -D / 2 + 0.8; z < D / 2; z += 1.6) { const l = mesh(new THREE.BoxGeometry(0.1, 0.02, 0.8), M.light); l.position.set(0, 0.07, z); root.add(l); }
  for (const sx of [-1, 1]) for (let z = -D / 2 + 0.5; z < D / 2; z += 1.0) {
    put(root, mesh(new THREE.BoxGeometry(0.06, 0.7, 0.9), M.metal), sx * 2.8, 0.38, z);
    put(root, mesh(new THREE.BoxGeometry(0.5, 0.04, 0.9), M.dark), sx * 2.8, 0.02, z);
  }
  // arche d'arrivée
  for (const sx of [-1, 1]) put(root, mesh(new THREE.BoxGeometry(0.3, 4.4, 0.3), M.metal), sx * 3.2, 2.2, -6.2);
  put(root, mesh(new RoundedBoxGeometry(6.8, 0.9, 0.4, 3, 0.1), M.dark), 0, 4.2, -6.2);
  put(root, mesh(new THREE.BoxGeometry(5.6, 0.06, 0.02), M.light), 0, 4.2, -5.98);
  // arbres
  const r = rng(3);
  for (let i = 0; i < 16; i++) {
    const sx = i % 2 ? 1 : -1, x = sx * (5 + r() * 4.5), z = (r() - 0.5) * (D - 2), s = 0.8 + r() * 0.8;
    put(root, mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.8 * s, 8), M.dark), x, 0.4 * s, z);
    put(root, mesh(new THREE.SphereGeometry(0.7 * s, 16, 12), M.pine), x, 1.2 * s, z);
  }
  // coureurs qui avancent vers l'arche
  const runners: { g: THREE.Group; v: number }[] = [];
  const lanes = [-1.6, -0.8, 0.2, 1.0, 1.7, -0.2, 0.9];
  lanes.forEach((x, i) => {
    const p = person(M, 1.7); p.position.set(x, 0.9 * 0, -D / 2 + (i * D) / lanes.length + 1); p.rotation.y = Math.PI;
    root.add(p); p.traverse((c) => { const m = c as THREE.Mesh; if (m.isMesh) { m.castShadow = true; } });
    p.position.y = 0.0; runners.push({ g: p, v: 1.6 + (i % 3) * 0.25 });
    if (i === 3) { const b = unit(M, 0.55); b.position.set(0.0, 1.35, 0.26); b.rotation.y = -Math.PI / 2; p.add(b); }
  });
  anim.push((t, dt) => {
    runners.forEach((rn, i) => {
      rn.g.position.z -= rn.v * dt; if (rn.g.position.z < -D / 2 + 1.2) rn.g.position.z = D / 2 - 0.4;
      const ph = t * 9 + i, u = rn.g.userData as { legL: THREE.Object3D; legR: THREE.Object3D };
      u.legL.rotation.x = Math.sin(ph) * 0.7; u.legR.rotation.x = -Math.sin(ph) * 0.7; rn.g.position.y = Math.abs(Math.sin(ph)) * 0.07;
    });
  });
  // drone qui suit le groupe
  const drone = new THREE.Group(); root.add(drone);
  put(drone, mesh(new RoundedBoxGeometry(0.7, 0.2, 0.7, 3, 0.06), M.dark));
  const rots: THREE.Object3D[] = [];
  for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
    put(drone, mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), M.metal), x * 0.7, 0.05, z * 0.7);
    const rt = put(drone, mesh(new THREE.BoxGeometry(0.62, 0.012, 0.06), M.light), x, 0.12, z); rots.push(rt);
  }
  put(drone, mesh(new THREE.SphereGeometry(0.1, 12, 8), M.dark), 0, -0.15, 0.3);
  drone.position.set(3.2, 4.2, -1);
  anim.push((t, dt) => { drone.position.y = 4.2 + Math.sin(t * 1.4) * 0.15; drone.position.z = -1 + Math.sin(t * 0.4) * 1.5; rots.forEach((x) => (x.rotation.y += dt * 50)); });
  link(root, M, drone, runners[3].g, anim);
  return { w: W, h: 10, cy: 2.8 };
}

function buildDesert(root: THREE.Group, M: Mats, anim: Anim[]) {
  const W = 22, D = 14;
  plinth(root, M, W, D);
  const hf = (x: number, z: number) => 1.5 * Math.sin(x * 0.32 + z * 0.18) + 1.0 * Math.sin(z * 0.5 - x * 0.12) + 0.25 * Math.sin(x * 1.6 + z * 0.9) + 1.2;
  root.add(terrain(W, D, 120, hf, M.sand));
  const sun = mesh(new THREE.SphereGeometry(1.5, 32, 24), M.sun); sun.position.set(-8, 7.5, -9); root.add(sun);
  const ring = mesh(new THREE.TorusGeometry(2.1, 0.02, 8, 64), M.sun); ring.position.copy(sun.position); root.add(ring);
  const px = -1.5, pz = 1.5;
  const dd = put(root, dish(M, 1.5), px, hf(px, pz) - 0.05, pz);
  put(root, unit(M, 1.2), px + 2.1, hf(px + 2.1, pz + 0.6) + 0.15, pz + 0.6);
  const sat = put(root, satellite(M, 0.8), 5.5, 8.6, -4);
  anim.push((t) => { sat.position.y = 8.6 + Math.sin(t * 0.8) * 0.15; sat.rotation.y = Math.sin(t * 0.3) * 0.18; });
  link(root, M, dd, sat, anim);
  // cactus
  for (const [x, z, s] of [[-6.5, -1.5, 1], [6, 3, 0.8], [-3, -4, 0.7]] as [number, number, number][]) {
    const c = new THREE.Group();
    put(c, mesh(new THREE.CapsuleGeometry(0.16, 1.4, 6, 12), M.pine), 0, 0.9, 0);
    for (const sx of [-1, 1]) { put(c, mesh(new THREE.CapsuleGeometry(0.1, 0.5, 6, 10), M.pine), sx * 0.34, 1.1 + (sx > 0 ? 0.1 : 0), 0); put(c, mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), M.pine), sx * 0.2, 0.85, 0).rotation.z = Math.PI / 2; }
    c.scale.setScalar(s); c.position.set(x, hf(x, z), z); root.add(c);
  }
  return { w: W, h: 11, cy: 3.2 };
}

/** Concert en stade (réf. photo) : scène avec écran LED, tours lumineuses, gradins, grande foule dense, régie au milieu. */
function buildCrowd(root: THREE.Group, M: Mats, anim: Anim[]) {
  const W = 34, D = 22;
  plinth(root, M, W, D);
  const fl = mesh(new THREE.BoxGeometry(W, 0.1, D), M.ground); fl.position.y = -0.05; fl.receiveShadow = true; root.add(fl);
  const r = rng(11);
  // scène : plateau, écran LED central, écrans latéraux, ferme de projecteurs, arche lumineuse
  const sz = -D / 2 + 1.8;
  put(root, mesh(new THREE.BoxGeometry(11, 1.2, 3.4), M.dark), 0, 0.6, sz);
  put(root, mesh(new THREE.PlaneGeometry(9.2, 4.0), M.screen), 0, 3.5, sz - 1.5);
  put(root, mesh(new THREE.BoxGeometry(9.4, 4.2, 0.2), M.rubber), 0, 3.5, sz - 1.62);
  for (const sx of [-1, 1]) {
    const sd = put(root, mesh(new THREE.PlaneGeometry(2.4, 3.0), M.screen), sx * 6.4, 3.0, sz - 0.6); sd.rotation.y = -sx * 0.35;
  }
  put(root, mesh(new THREE.BoxGeometry(12, 0.18, 0.18), M.metal), 0, 6.1, sz - 0.4);
  for (let i = -5; i <= 5; i++) put(root, mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.3, 10), M.dark), i * 1.05, 5.9, sz - 0.4);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.07, 8, 56, Math.PI), M.warm); arch.position.set(0, 1.25, sz + 1.5); put(root, arch);
  // tours de sono / lumière (bandes chaudes)
  const towers: THREE.Object3D[] = [];
  for (const [x, z] of [[-7.5, -2], [7.5, -2], [-7.5, 4.8], [7.5, 4.8]] as [number, number][]) {
    put(root, mesh(new THREE.BoxGeometry(0.7, 4.6, 0.7), M.rubber), x, 2.3, z);
    for (let k = 0; k < 3; k++) put(root, mesh(new THREE.BoxGeometry(0.72, 0.12, 0.72), M.warm), x, 1.2 + k * 1.3, z);
    towers.push(root.children[root.children.length - 1]);
  }
  // gradins latéraux et du fond : marches, spectateurs instanciés, auvent
  const rows = 7, step = 0.9;
  const sideSpecs: THREE.Matrix4[] = [];
  const mm = new THREE.Matrix4();
  for (const sx of [-1, 1]) {
    for (let k = 0; k < rows; k++) {
      const sxk = sx * (W / 2 - 1 - (rows - 1 - k) * 1.1);
      put(root, mesh(new THREE.BoxGeometry(1.1, (k + 1) * step, D - 3), M.stand), sxk, ((k + 1) * step) / 2, 0.8);
      for (let z = -D / 2 + 3; z < D / 2 - 1.5; z += 0.62) {
        if (r() < 0.82) { mm.compose(new THREE.Vector3(sxk, (k + 1) * step + 0.38, z + r() * 0.2), new THREE.Quaternion(), new THREE.Vector3(0.7, 0.7, 0.7)); sideSpecs.push(mm.clone()); }
      }
    }
  }
  const fans = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.32, 4, 8), M.body, sideSpecs.length);
  sideSpecs.forEach((m, i) => fans.setMatrixAt(i, m)); fans.castShadow = true; root.add(fans);
  for (const sx of [-1, 1]) put(root, mesh(new THREE.BoxGeometry(5.2, 0.25, D - 2), M.rubber), sx * (W / 2 - 3.2), 8.2, 0.2);
  // foule dense au sol : capsules instanciées, bras levés qui ondulent
  const cells: { x: number; z: number; s: number; up: boolean; ph: number }[] = [];
  for (let x = -9; x <= 9; x += 0.48) for (let z = -5.6; z <= 8.8; z += 0.46) {
    if (Math.abs(x) < 1.3 && z > 1.6 && z < 3.4) continue; // régie
    cells.push({ x: x + (r() - 0.5) * 0.3, z: z + (r() - 0.5) * 0.3, s: 0.62 + r() * 0.12, up: r() < 0.2, ph: r() * 6.28 });
  }
  const N = cells.length;
  const bodies = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.21, 0.62, 5, 10), M.body, N);
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 12, 10), M.skin, N);
  const ups = cells.map((c, i) => (c.up ? i : -1)).filter((i) => i >= 0);
  const arms = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.05, 0.5, 3, 6), M.skin, ups.length * 2);
  [bodies, heads, arms].forEach((m) => { m.castShadow = true; m.receiveShadow = true; root.add(m); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const place = (m: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rz: number, s: number) => { e.set(0, 0, rz); q.setFromEuler(e); m4.compose(v.set(x, y, z), q, sc.setScalar(s)); m.setMatrixAt(i, m4); };
  cells.forEach((c, i) => { place(bodies, i, c.x, 0.85 * c.s + 0.1, c.z, 0, c.s); place(heads, i, c.x, 1.55 * c.s + 0.1, c.z, 0, c.s); });
  const updateArms = (t: number) => {
    ups.forEach((ci, k) => {
      const c = cells[ci], a = 2.75 + Math.sin(t * 4.5 + c.ph) * 0.3;
      place(arms, k * 2, c.x - 0.3 * c.s, 1.35 * c.s + 0.25, c.z, a, c.s);
      place(arms, k * 2 + 1, c.x + 0.3 * c.s, 1.35 * c.s + 0.25, c.z, -a, c.s);
    });
    arms.instanceMatrix.needsUpdate = true;
  };
  updateArms(0); anim.push((t) => updateArms(t));
  bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true;
  // régie de façade
  put(root, mesh(new RoundedBoxGeometry(2.2, 1.0, 1.4, 3, 0.08), M.dark), 0, 0.5, 2.5);
  put(root, mesh(new THREE.BoxGeometry(1.8, 0.04, 0.5), M.warm), 0, 1.03, 2.4);
  // antenne-relais, boîtier devant la barrière, liaison
  const tw = put(root, tower(M, 5.2), W / 2 - 4.2, 0, -D / 2 + 1.8);
  const bar = put(root, mesh(new THREE.BoxGeometry(14, 0.9, 0.12), M.metal), 0, 0.45, D / 2 - 1.2);
  void bar;
  const u = put(root, unit(M, 1.4), -4.2, 1.05, D / 2 - 1.2);
  link(root, M, u, tw, anim);
  void towers;
  return { w: 34, h: 12.5, cy: 3.4 };
}

/* ---------------------------------------------------------------- moteur */

export function createScene(canvas: HTMLCanvasElement, kind: SceneKind): SceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex; scene.environmentIntensity = 0.32;
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-9, 16, 10); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -24, right: 24, top: 14, bottom: -14, near: 1, far: 60 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  const rim = new THREE.DirectionalLight(0xcfd8ee, 1.4); rim.position.set(10, 8, -14);
  scene.add(key, rim, new THREE.HemisphereLight(0xdfe3ea, 0x101114, 0.3));

  const M = makeMats();
  const root = new THREE.Group(); scene.add(root);
  const anim: Anim[] = [];
  const dims =
    kind === 'boat' ? buildBoat(root, M, anim)
    : kind === 'heli' ? buildMountain(root, M, anim, 'heli')
    : kind === 'mountain' ? buildMountain(root, M, anim, 'mountain')
    : kind === 'marathon' ? buildMarathon(root, M, anim)
    : kind === 'desert' ? buildDesert(root, M, anim)
    : buildCrowd(root, M, anim);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 200);
  let sw = 1, sh = 1;
  const orbit = { a: 0 };
  const frame = (t: number) => {
    const aspect = sw / sh, vh = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vh / 2) * aspect);
    const dist = Math.max((dims.w * 0.62) / Math.tan(hFov / 2), (dims.h * 0.78) / Math.tan(vh / 2));
    const ang = 0.18 + Math.sin(t * 0.18) * 0.28 + orbit.a;
    const pitch = 0.5;
    camera.position.set(Math.sin(ang) * dist * Math.cos(pitch), dist * Math.sin(pitch) + 1, Math.cos(ang) * dist * Math.cos(pitch));
    camera.lookAt(0, dims.cy - 1.4, 0);
  };
  const resize = () => {
    const p = canvas.parentElement ?? canvas;
    sw = p.clientWidth || 1; sh = p.clientHeight || 1;
    renderer.setSize(sw, sh, false); camera.aspect = sw / sh; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => { resize(); draw(clock.elapsedTime, 0); }); ro.observe(canvas.parentElement ?? canvas);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock(false);
  let raf = 0, alive = true, last = 0;
  const draw = (t: number, dt: number) => { anim.forEach((f) => f(t, dt)); frame(t); renderer.render(scene, camera); };
  const loop = () => {
    const t = clock.getElapsedTime(), dt = Math.min(0.05, t - last); last = t;
    draw(t, dt); raf = requestAnimationFrame(loop);
  };
  resize(); draw(0, 0);

  return {
    setActive(a: boolean) {
      if (!alive) return;
      if (a && !raf && !reduce) { clock.start(); last = clock.elapsedTime; raf = requestAnimationFrame(loop); }
      if (!a && raf) { cancelAnimationFrame(raf); raf = 0; clock.stop(); }
      if (a && reduce) draw(0, 0);
    },
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh; m.geometry?.dispose();
      });
      Object.values(M).forEach((m) => m.dispose());
      envTex.dispose(); pmrem.dispose(); renderer.dispose();
    },
  };
}
