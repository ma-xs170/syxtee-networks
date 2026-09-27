// Stabilisation électronique (EIS) de SYXTEE Cam, faite dans le navigateur.
// Aucun navigateur n'expose la stabilisation matérielle du téléphone : on lit le gyroscope (DeviceMotion),
// on recadre l'image de MARGIN par bord et on décale / tourne ce cadre à l'inverse des tremblements.
// Les mouvements volontaires (panoramique, inclinaison lente) passent grâce à un filtre passe-haut.
// Sortie : un <canvas> capturé en piste vidéo (captureStream), qui remplace la piste de la caméra.

const MARGIN = 0.08; // recadrage par bord (8 %) : marge de correction, au prix d'un léger zoom
const MAX_ROLL = (2.5 * Math.PI) / 180; // rotation corrigée au plus
const TAU = 0.7; // s : temps de réponse du suivi des mouvements volontaires
const MAIN_HFOV = (63 * Math.PI) / 180; // champ horizontal approximatif de l'objectif principal (16:9)

type Axes = { yaw: number; pitch: number; roll: number };

/** Vitesses de rotation (rad/s) autour des axes de l'IMAGE, selon l'orientation de l'écran. */
export function imageRates(r: { alpha: number; beta: number; gamma: number }, screenAngle: number): Axes {
  const d = Math.PI / 180;
  const x = r.beta * d; // axe x du téléphone (bord droit en portrait)
  const y = r.gamma * d; // axe y (haut du téléphone en portrait)
  const z = r.alpha * d; // axe z (sort de l'écran)
  switch (((screenAngle % 360) + 360) % 360) {
    case 90: // paysage, haut du téléphone à gauche : haut de l'écran = +x, droite = -y
      return { yaw: x, pitch: -y, roll: z };
    case 270: // paysage, haut du téléphone à droite
      return { yaw: -x, pitch: y, roll: z };
    case 180:
      return { yaw: -y, pitch: -x, roll: z };
    default: // portrait
      return { yaw: y, pitch: x, roll: z };
  }
}

export function stabilizationSupported() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

/** iOS demande l'autorisation du gyroscope, à appeler depuis un geste (toucher un bouton). */
export async function requestMotionPermission(): Promise<boolean> {
  const D = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
  if (typeof D.requestPermission !== "function") return true;
  try {
    return (await D.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export class Stabilizer {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d", { alpha: false })!;
  private src = document.createElement("video");
  private out: MediaStream;
  private angle: Axes = { yaw: 0, pitch: 0, roll: 0 };
  private follow: Axes = { yaw: 0, pitch: 0, roll: 0 };
  private lastMotion = 0;
  private zoom = 1;
  private running = false;
  private gotMotion = false;

  constructor(fps = 30) {
    this.src.muted = true;
    this.src.playsInline = true;
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.out = this.canvas.captureStream(fps);
  }

  /** Piste vidéo stabilisée (la même pendant toute la session, même si la caméra change). */
  get track() {
    return this.out.getVideoTracks()[0];
  }

  /** Vrai si le gyroscope a envoyé des mesures (faux sur ordinateur). */
  get hasMotion() {
    return this.gotMotion;
  }

  setZoom(z: number) {
    this.zoom = z > 0 ? z : 1;
  }

  async setSource(stream: MediaStream) {
    this.src.srcObject = stream;
    await this.src.play().catch(() => {});
    const s = stream.getVideoTracks()[0]?.getSettings();
    if (s?.width && s?.height) {
      this.canvas.width = s.width;
      this.canvas.height = s.height;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    window.addEventListener("devicemotion", this.onMotion);
    this.loop();
  }

  stop() {
    this.running = false;
    window.removeEventListener("devicemotion", this.onMotion);
    this.track?.stop();
    this.src.srcObject = null;
  }

  private onMotion = (e: DeviceMotionEvent) => {
    const r = e.rotationRate;
    if (!r || r.alpha === null || r.beta === null || r.gamma === null) return;
    this.gotMotion = true;
    const now = performance.now();
    const dt = this.lastMotion ? Math.min(0.1, (now - this.lastMotion) / 1000) : 0;
    this.lastMotion = now;
    const w = imageRates({ alpha: r.alpha, beta: r.beta, gamma: r.gamma }, screen.orientation?.angle ?? 0);
    const k = 1 - Math.exp(-dt / TAU);
    for (const a of ["yaw", "pitch", "roll"] as const) {
      this.angle[a] += w[a] * dt;
      this.follow[a] += (this.angle[a] - this.follow[a]) * k; // passe-bas = mouvement volontaire
    }
  };

  private loop = () => {
    if (!this.running) return;
    this.draw();
    const v = this.src as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(this.loop);
    else requestAnimationFrame(this.loop);
  };

  private draw() {
    const { width: W, height: H } = this.canvas;
    if (this.src.readyState < 2) return;
    const scale = 1 / (1 - 2 * MARGIN);
    // Pixels par radian dans l'image de sortie (focale équivalente), selon le zoom de l'objectif.
    const hfov = 2 * Math.atan(Math.tan(MAIN_HFOV / 2) / this.zoom);
    const f = (scale * W) / (2 * Math.tan(hfov / 2));
    const maxX = ((scale - 1) / 2) * W;
    const maxY = ((scale - 1) / 2) * H;
    // Tremblement = angle réel - mouvement volontaire, limité à ce que la marge permet de corriger.
    // Au-delà, le suivi rattrape l'angle réel (le cadre « colle » au bord au lieu de montrer du noir).
    const shake = (a: keyof Axes, limit: number) => {
      const d = this.angle[a] - this.follow[a];
      if (Math.abs(d) <= limit) return d;
      this.follow[a] = this.angle[a] - Math.sign(d) * limit;
      return Math.sign(d) * limit;
    };
    const dx = f * Math.tan(shake("yaw", Math.atan(maxX / f)));
    const dy = f * Math.tan(shake("pitch", Math.atan(maxY / f)));
    const roll = shake("roll", MAX_ROLL);

    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(W / 2, H / 2);
    c.rotate(-roll);
    // Caméra tournée vers la gauche → l'image part à droite : on dessine décalé à gauche (et de même en vertical).
    c.translate(-dx, -dy);
    c.scale(scale, scale);
    c.drawImage(this.src, -W / 2, -H / 2, W, H);
  }
}
