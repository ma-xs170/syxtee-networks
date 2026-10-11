/**
 * SYXTEE Encodeur — scène 3D (Three.js pur, sans React).
 * Compatible three >= 0.160. 1 unité = 1 cm.
 */
import * as THREE from 'three';

export type Finish = 'noir' | 'argent';
export type LedState = 'veille' | 'pret' | 'direct';
export type ViewName = 'q' | 'front' | 'rear' | 'top' | 'bottom';
export type Theme = 'light' | 'dark';

export interface EncoderOptions {
  finish?: Finish;
  led?: LedState;
  /** Réglage de l'ombre et de l'exposition selon le fond de ta page. */
  theme?: Theme;
  view?: ViewName;
  /** Glisser pour tourner, molette / pincement pour zoomer. */
  interactive?: boolean;
  /** Famille de police du texte gravé (doit être déjà chargée sur la page). */
  fontFamily?: string;
}

export interface EncoderHandle {
  setFinish(f: Finish): void;
  setLed(l: LedState): void;
  setTheme(t: Theme): void;
  setView(v: ViewName): void;
  dispose(): void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const FINISHES = {
  noir: { body: 0x25262a, rough: 0.4, metal: 0.92, base: 0x0b0b0d, logo: 0xf1f2f5, rim: 0xc9cbd1 },
  argent: { body: 0xd2d3d7, rough: 0.34, metal: 1.0, base: 0x2d2e32, logo: 0xffffff, rim: 0xeceef1 },
} as const;

const LEDS = {
  veille: { c: 0xff9a1f, i: 0.9, g: 0.3, pulse: false },  // orange
  pret: { c: 0x45ee86, i: 1.0, g: 0.34, pulse: false },   // vert
  direct: { c: 0xff3b30, i: 1.0, g: 0.5, pulse: true },   // rouge
} as const;

const VIEWS: Record<ViewName, { th: number; ph: number; s: number }> = {
  q: { th: -0.62, ph: 1.17, s: 1.0 },
  front: { th: 0, ph: 1.4, s: 0.88 },
  rear: { th: Math.PI, ph: 1.34, s: 0.8 },
  top: { th: 0, ph: 0.16, s: 0.92 },
  bottom: { th: -0.55, ph: 2.38, s: 1.0 },
};

/* ---------- helpers géométrie ---------- */
function rrShape(w: number, h: number, r: number) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2, P = Math.PI;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -P / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, P / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, P / 2, P, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, P, P * 1.5, false);
  return s;
}
function polyShape(pts: number[][]) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath(); return s;
}
/** Normales lissées pondérées par l'angle, en gardant les UV. */
function smoothNormals(g: THREE.BufferGeometry) {
  const p = g.attributes.position as THREE.BufferAttribute;
  const acc: Record<string, THREE.Vector3> = {};
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3();
  const key = (i: number) => Math.round(p.getX(i) * 1000) + ',' + Math.round(p.getY(i) * 1000) + ',' + Math.round(p.getZ(i) * 1000);
  const vs = [a, b, c];
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
    fn.copy(b).sub(a).cross(e2.copy(c).sub(a));
    if (fn.lengthSq() < 1e-14) continue;
    fn.normalize();
    for (let k = 0; k < 3; k++) {
      const v0 = vs[k], v1 = vs[(k + 1) % 3], v2 = vs[(k + 2) % 3];
      e1.copy(v1).sub(v0).normalize(); e2.copy(v2).sub(v0).normalize();
      const ang = Math.acos(clamp(e1.dot(e2), -1, 1));
      const kk = key(i + k);
      (acc[kk] || (acc[kk] = new THREE.Vector3())).addScaledVector(fn, ang);
    }
  }
  const n = new Float32Array(p.count * 3), tmp = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    tmp.copy(acc[key(i)] || new THREE.Vector3(0, 1, 0)).normalize();
    n[i * 3] = tmp.x; n[i * 3 + 1] = tmp.y; n[i * 3 + 2] = tmp.z;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(n, 3));
}
function slab(w: number, r: number, h: number, bev: number) {
  const depth = h - 2 * bev;
  const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * bev, w - 2 * bev, r - bev), {
    depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 10, curveSegments: 36, steps: 1,
  });
  smoothNormals(g);
  g.translate(0, 0, -depth / 2); g.rotateX(-Math.PI / 2);
  return g;
}

/* ---------- textures ---------- */
function canvasTex(c: HTMLCanvasElement, srgb = false) {
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function makeGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!, d = x.createImageData(512, 512);
  for (let i = 0; i < d.data.length; i += 4) {
    const v = 226 + Math.random() * 29 | 0;
    d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255;
  }
  x.putImageData(d, 0, 0);
  const t = canvasTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 5, 1 / 5);
  return t;
}
function rrPath(ctx: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(X + r, Y); ctx.arcTo(X + w, Y, X + w, Y + h, r); ctx.arcTo(X + w, Y + h, X, Y + h, r);
  ctx.arcTo(X, Y + h, X, Y, r); ctx.arcTo(X, Y, X + w, Y, r); ctx.closePath();
}
function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!; const half = 98, cx = 256, cy = 248;
  for (let i = 0; i < 60; i++) {
    const g = (i / 59) * 46; x.fillStyle = 'rgba(0,0,0,0.0075)';
    rrPath(x, cx - half - g, cy - half - g * 0.8 + 6, (half + g) * 2, (half + g * 0.8) * 2, 26 + g); x.fill();
  }
  for (let i = 0; i < 20; i++) {
    const g = (i / 19) * 10; x.fillStyle = 'rgba(0,0,0,0.05)';
    rrPath(x, cx - half - g, cy - half - g, (half + g) * 2, (half + g) * 2, 24 + g); x.fill();
  }
  return canvasTex(c, true);
}
function dotsTexture() {
  const c = document.createElement('canvas'); c.width = 1800; c.height = 280;
  const x = c.getContext('2d')!; x.fillStyle = '#000';
  const pitch = 34, r = 8.5; let row = 0;
  for (let yy = 24; yy < 268; yy += pitch * 0.866, row++) {
    for (let xx = 24 + (row % 2 ? pitch / 2 : 0); xx < 1788; xx += pitch) { x.beginPath(); x.arc(xx, yy, r, 0, Math.PI * 2); x.fill(); }
  }
  return canvasTex(c, true);
}
function glowTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d')!; x.save(); x.scale(1, 0.25);
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.restore();
  return canvasTex(c, true);
}
function contactsMesh(n: number, w: number, h: number, col: string) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d')!; x.fillStyle = col; const cw = 512 / (n * 2 - 1);
  for (let i = 0; i < n; i++) x.fillRect(i * cw * 2, 6, cw, 52);
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: canvasTex(c, true), transparent: true, metalness: 0.9, roughness: 0.35 }));
}

/* ---------- API ---------- */
export function createEncoder(canvas: HTMLCanvasElement, opts: EncoderOptions = {}): EncoderHandle {
  const font = opts.fontFamily ?? 'Geist, "Helvetica Neue", Arial, sans-serif';
  const interactive = opts.interactive ?? true;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 400);

  /* environnement studio */
  let envTex: THREE.Texture;
  {
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(60, 48, 24);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 60;
      const v = Math.max(y > 0 ? 0.05 + y * 0.16 : 0.05 + y * 0.03, 0.02);
      cols[i * 3] = v; cols[i * 3 + 1] = v; cols[i * 3 + 2] = v * 1.04;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
    const panel = (w: number, h: number, x: number, y: number, z: number, k: number, tint?: number[]) => {
      const m = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      m.color.setRGB(k * (tint ? tint[0] : 1), k * (tint ? tint[1] : 1), k * (tint ? tint[2] : 1));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
    };
    panel(44, 44, 0, 46, 0, 5.5);
    panel(26, 20, -34, 24, 30, 7.5, [1, 0.98, 0.95]);
    panel(9, 38, 38, 12, 8, 9);
    panel(9, 38, -42, 10, -10, 4.5);
    panel(46, 7, 0, 18, -42, 9);
    panel(50, 9, 0, -4, 44, 1.3);
    const pm = new THREE.PMREMGenerator(renderer);
    envTex = pm.fromScene(env, 0.015).texture;
    pm.dispose();
    scene.environment = envTex;
  }

  /* logo : éclair + SYXTEE NETWORKS */
  const grain = makeGrain();
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = logoCanvas.height = 1024;
  const logoTex = canvasTex(logoCanvas);
  const drawLogo = () => {
    const x = logoCanvas.getContext('2d')!;
    x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 1024); x.fillStyle = '#fff';
    const sc = 7.6, bw = 44 * sc, bh = 52 * sc;
    x.save(); x.translate(512 - bw / 2, 520 - bh / 2 - 40); x.scale(sc, sc);
    x.fill(new Path2D('M30 0 L4 22 L20 26 L6 52 L42 20 L24 16 Z')); x.restore();
    x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = '600 58px ' + font;
    const word = 'SYXTEE NETWORKS', sp = 15; let total = 0; const ws: number[] = [];
    for (let k = 0; k < word.length; k++) { ws[k] = x.measureText(word[k]).width; total += ws[k] + (k < word.length - 1 ? sp : 0); }
    let px = 512 - total / 2;
    for (let k = 0; k < word.length; k++) { x.fillText(word[k], px, 790); px += ws[k] + sp; }
    logoTex.needsUpdate = true;
  };
  drawLogo();
  let alive = true;
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (alive) drawLogo(); });

  /* dimensions */
  const W = 13, R = 1.7, FEET = 0.15, BASEH = 0.5, SH = 3.0, BEV = 0.22;
  const TOP = FEET + BASEH + SH, YC = 2.2;
  const product = new THREE.Group(); scene.add(product);

  const bodyMat = new THREE.MeshStandardMaterial({ metalness: 0.92, roughness: 0.4, roughnessMap: grain, envMap: envTex });
  const baseMat = new THREE.MeshStandardMaterial({ metalness: 0.6, roughness: 0.55, roughnessMap: grain, envMap: envTex, envMapIntensity: 0.9 });
  const logoMat = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.07, alphaMap: logoTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMap: envTex, envMapIntensity: 1.7 });
  const rimMat = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0.2, envMap: envTex, envMapIntensity: 1.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, metalness: 0, roughness: 0.92 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x040405, metalness: 0, roughness: 0.95 });

  const shell = new THREE.Mesh(slab(W, R, SH, BEV), bodyMat); shell.position.y = FEET + BASEH + SH / 2; product.add(shell);
  const base = new THREE.Mesh(slab(W - 0.4, R - 0.2, BASEH, 0.06), baseMat); base.position.y = FEET + BASEH / 2; product.add(base);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, FEET, 40), rubber);
    f.position.set(sx * 4.7, FEET / 2, sz * 4.7); product.add(f);
  }
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 6.8), logoMat);
  logo.rotation.x = -Math.PI / 2; logo.position.y = TOP + 0.004; logo.renderOrder = 2; product.add(logo);

  const ventMat = new THREE.MeshStandardMaterial({ map: dotsTexture(), transparent: true, roughness: 0.9, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  for (const s of [-1, 1]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(9.0, 1.4), ventMat);
    v.rotation.y = s * Math.PI / 2; v.position.set(s * (W / 2 + 0.003), YC, 0); v.renderOrder = 2; product.add(v);
  }

  /* voyant */
  const slot = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(2.9, 0.26, 0.13), 24), blackMat);
  slot.position.set(0, 1.4, W / 2 + 0.004); slot.renderOrder = 2; product.add(slot);
  const ledMat = new THREE.MeshStandardMaterial({ color: 0x101012, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.4, metalness: 0 });
  const led = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(2.3, 0.08, 0.04), 16), ledMat);
  led.position.set(0, 1.4, W / 2 + 0.008); led.renderOrder = 3; product.add(led);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffffff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), glowMat);
  glow.position.set(0, 1.4, W / 2 + 0.012); glow.renderOrder = 4; product.add(glow);

  /* face arrière */
  const rear = new THREE.Group(); rear.position.set(0, 0, -W / 2 - 0.003); rear.rotation.y = Math.PI; product.add(rear);
  type Kind = 'usbc' | 'hdmi' | 'eth';
  const PORTS: { x: number; w: number; h: number; kind: Kind }[] = [
    { x: -4.7, w: 0.9, h: 0.35, kind: 'usbc' }, { x: -2.5, w: 1.6, h: 1.35, kind: 'eth' },
    { x: 0.45, w: 1.5, h: 0.56, kind: 'hdmi' }, { x: 3.0, w: 0.9, h: 0.35, kind: 'usbc' },
  ];
  const portShape = (kind: Kind, w: number, h: number) => {
    if (kind === 'usbc') return rrShape(w, h, h / 2 - 0.005);
    if (kind === 'hdmi') { const c = h * 0.5; return polyShape([[-w / 2, h / 2], [w / 2, h / 2], [w / 2, -h * 0.05], [w / 2 - c, -h / 2], [-w / 2 + c, -h / 2], [-w / 2, -h * 0.05]]); }
    const hw = w / 2, hh = h / 2;
    return polyShape([[-hw, -hh], [-hw, hh], [-0.32, hh], [-0.32, hh + 0.17], [0.32, hh + 0.17], [0.32, hh], [hw, hh], [hw, -hh]]);
  };
  const tongueMat = new THREE.MeshStandardMaterial({ color: 0x35363b, metalness: 0.5, roughness: 0.5 });
  for (const p of PORTS) {
    const g = new THREE.Group(); g.position.set(p.x, YC, 0);
    g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(portShape(p.kind, p.w + 0.17, p.h + 0.17), { depth: 0.01, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 20 }), rimMat));
    const hole = new THREE.Mesh(new THREE.ShapeGeometry(portShape(p.kind, p.w, p.h), 24), blackMat); hole.position.z = 0.044; g.add(hole);
    if (p.kind === 'usbc') {
      const t = new THREE.Mesh(new THREE.ShapeGeometry(rrShape(p.w * 0.78, p.h * 0.2, 0.03), 12), tongueMat); t.position.z = 0.048; g.add(t);
    } else if (p.kind === 'hdmi') {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.84, p.h * 0.34), tongueMat); t.position.set(0, -p.h * 0.1, 0.048); g.add(t);
      const ct = contactsMesh(19, p.w * 0.78, p.h * 0.13, '#c9a45a'); ct.position.set(0, -p.h * 0.1, 0.05); g.add(ct);
    } else {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.86, p.h * 0.5), tongueMat); t.position.set(0, -p.h * 0.12, 0.048); g.add(t);
      const ct = contactsMesh(8, p.w * 0.7, p.h * 0.11, '#c9a45a'); ct.position.set(0, p.h * 0.28, 0.05); g.add(ct);
    }
    rear.add(g);
  }
  const pin = new THREE.Group(); pin.position.set(4.9, YC, 0);
  const pr = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 12, 32), rimMat); pr.position.z = 0.02; pin.add(pr);
  const ph = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), blackMat); ph.position.z = 0.03; pin.add(ph);
  rear.add(pin);

  const labelsCanvas = document.createElement('canvas'); labelsCanvas.width = 2048; labelsCanvas.height = 96;
  const labelsTex = canvasTex(labelsCanvas, true);
  const drawLabels = () => {
    const x = labelsCanvas.getContext('2d')!; x.clearRect(0, 0, 2048, 96);
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.font = '600 34px ' + font;
    const put = (txt: string, cx: number) => {
      const px = (cx + 6.4) / 12.8 * 2048, sp = 5; let tot = 0; const ws: number[] = [];
      for (let i = 0; i < txt.length; i++) { ws[i] = x.measureText(txt[i]).width; tot += ws[i] + sp; }
      tot -= sp; let cur = px - tot / 2; x.textAlign = 'left';
      for (let i = 0; i < txt.length; i++) { x.fillText(txt[i], cur, 48); cur += ws[i] + sp; }
    };
    put('PWR', -4.7); put('ETH', -2.5); put('HDMI IN', 0.45); put('USB-C', 3.0); put('SYNC', 4.9);
    labelsTex.needsUpdate = true;
  };
  drawLabels();
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (alive) drawLabels(); });
  const labels = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 0.6), new THREE.MeshStandardMaterial({ map: labelsTex, transparent: true, color: 0xc8c9cd, roughness: 0.85, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  labels.position.set(0, 1.18, 0.004); labels.renderOrder = 2; rear.add(labels);

  /* ombre au sol */
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.9 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), shadowMat);
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);

  /* état */
  let ledNow: LedState = 'pret';
  const setFinish = (n: Finish) => {
    const f = FINISHES[n];
    bodyMat.color.setHex(f.body); bodyMat.roughness = f.rough; bodyMat.metalness = f.metal;
    baseMat.color.setHex(f.base); logoMat.color.setHex(f.logo); rimMat.color.setHex(f.rim);
  };
  const setLed = (n: LedState) => { ledNow = n; ledMat.emissive.setHex(LEDS[n].c); glowMat.color.setHex(LEDS[n].c); };
  const setTheme = (t: Theme) => { shadowMat.opacity = t === 'dark' ? 0.95 : 0.8; renderer.toneMappingExposure = t === 'dark' ? 1.0 : 1.08; };
  setFinish(opts.finish ?? 'noir'); setLed(opts.led ?? 'pret'); setTheme(opts.theme ?? 'dark');

  /* caméra orbitale */
  const T = new THREE.Vector3(0, 1.85, 0);
  const v0 = VIEWS[opts.view ?? 'q'];
  const cur = { th: v0.th, ph: v0.ph, r: 70 }, tgt = { th: v0.th, ph: v0.ph };
  let vs = v0.s, zoomT = 1, sw = 1, sh = 1;
  const rBase = () => Math.max(52, 40 / (sw / sh));
  const setView = (name: ViewName) => {
    const v = VIEWS[name], TP = Math.PI * 2;
    tgt.th = v.th + TP * Math.round((cur.th - v.th) / TP); tgt.ph = v.ph; vs = v.s; zoomT = 1;
  };

  const pts = new Map<number, { x: number; y: number }>(); let lastD = 0;
  const onDown = (e: PointerEvent) => { try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ } pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); lastD = 0; };
  const onUp = (e: PointerEvent) => { pts.delete(e.pointerId); lastD = 0; };
  const onMove = (e: PointerEvent) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) { tgt.th -= dx * 0.0072; tgt.ph = clamp(tgt.ph - dy * 0.006, 0.1, 2.5); }
    else if (pts.size === 2) {
      const [a, b] = Array.from(pts.values()); const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastD) zoomT = clamp(zoomT * (lastD / d), 0.45, 1.7); lastD = d;
    }
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomT = clamp(zoomT * Math.exp(e.deltaY * 0.0012), 0.45, 1.7); };
  if (interactive) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
  }

  const target = canvas.parentElement ?? canvas;
  const resize = () => {
    sw = target.clientWidth || 1; sh = target.clientHeight || 1;
    renderer.setSize(sw, sh, false); camera.aspect = sw / sh; camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(target); resize();
  cur.r = rBase() * 1.25;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now(), raf = 0;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const k = reduce ? 1 : 1 - Math.exp(-dt * 7);
    cur.th += (tgt.th - cur.th) * k; cur.ph += (tgt.ph - cur.ph) * k;
    cur.r += (rBase() * vs * zoomT - cur.r) * k;
    const sp = Math.sin(cur.ph);
    camera.position.set(T.x + cur.r * sp * Math.sin(cur.th), T.y + cur.r * Math.cos(cur.ph), T.z + cur.r * sp * Math.cos(cur.th));
    camera.lookAt(T);
    const st = LEDS[ledNow], pulse = st.pulse ? 0.7 + 0.3 * Math.sin(now / 1000 * 2.6) : 1;
    ledMat.emissiveIntensity = st.i * pulse * 2.2; glowMat.opacity = st.g * pulse;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    setFinish, setLed, setTheme, setView,
    dispose() {
      alive = false; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('wheel', onWheel);
      scene.traverse((o) => {
        const m = o as THREE.Mesh; m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      envTex.dispose(); renderer.dispose();
    },
  };
}
