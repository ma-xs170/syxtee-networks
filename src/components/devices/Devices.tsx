"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Appareils génériques en SVG + CSS, toujours en coloris sombre (noir sidéral, titane noir, minuit). Ni logo, ni texte, ni marque gravés.
// Chaque appareil reçoit en enfant l'interface HTML réelle de l'écran (interactive) : l'écran est dessiné à taille fixe puis réduit par transform,
// pour garder le même ratio quel que soit le viewport. Si un rendu 3D est déposé dans /public/devices/, il remplace le cadre (props `image`).
// Lisibilité : chaque silhouette porte un contour métallique d'1 px (dégradé clair en haut à gauche) et un liseré clair sur la tranche, pour se détacher d'un fond #000.

/** Écran : contenu de taille fixe (w x h) réduit pour remplir son conteneur, qui s'allume (fondu depuis le noir) à l'apparition. */
export function Screen({ w, h, children, className = "" }: { w: number; h: number; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / w));
    ro.observe(el);
    setK(el.clientWidth / w);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={box} className={`relative h-full w-full overflow-hidden bg-black ${className}`}>
      <div style={{ width: w, height: h, transform: `scale(${k || 0.0001})`, transformOrigin: "top left" }} className={k ? "" : "invisible"}>
        {children}
      </div>
      {/* allumage : un voile noir qui se lève (opacité seulement : un filtre animé disparaît dans un contexte 3D) */}
      <span aria-hidden="true" className="screen-boot pointer-events-none absolute inset-0 bg-black" />
      {/* reflet : dégradé diagonal fixe à 4 % + balayage au survol */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_45%)]" />
      <span aria-hidden="true" className="device-glare pointer-events-none absolute inset-0" />
    </div>
  );
}

/** Contour métallique d'1 px : dégradé de #3A3A3E vers #1A1A1C, reflet clair en haut à gauche. */
const METAL_EDGE = "bg-[linear-gradient(135deg,#8a8a92_0%,#3a3a3e_22%,#1a1a1c_60%,#34343a_100%)]";
const BODY = "bg-[linear-gradient(160deg,#2a2b30_0%,#141518_45%,#0b0b0d_100%)]";

type Img = { image?: string | null };
const Photo = ({ src }: { src: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
);

/** Ordinateur portable ouvert : couvercle alu noir avec bezel et contour métallique, encoche, charnière, base et clavier visibles en perspective. Écran 1280 x 800. */
export function DeviceMac({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[958/580]">
          <Photo src={image} />
          {/* écran du MacBook Pro 14 : sous l'encoche, 16:10 */}
          <div className="absolute left-[10.33%] top-[5.69%] h-[81.9%] w-[79.33%] overflow-hidden rounded-b-[0.7%]"><Screen w={1280} h={800}>{children}</Screen></div>
        </div>
      ) : (
        <div>
          {/* de face : une rotation 3D casserait le ciblage des clics dans l'écran interactif */}
          <div>
            {/* couvercle : contour métallique (1 px), tranche claire en haut et sur les côtés */}
            <div className={`relative rounded-[20px] p-px ${METAL_EDGE} shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_0_80px_-10px_rgba(255,255,255,0.08)]`}>
              <div className="relative rounded-[19px] bg-[#050506] p-[1.7%] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_1px_0_0_rgba(255,255,255,0.12),inset_-1px_0_0_rgba(255,255,255,0.08)]">
                <span aria-hidden="true" className="absolute left-1/2 top-[0.2%] z-20 h-[2.1%] w-[8%] -translate-x-1/2 rounded-b-[7px] bg-black" />
                <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-black ring-1 ring-white/10">
                  <Screen w={1280} h={800}>{children}</Screen>
                </div>
              </div>
            </div>
            {/* charnière */}
            <div aria-hidden="true" className="relative mx-auto h-[7px] w-[103%] -translate-x-[1.5%] rounded-b-[4px] bg-[linear-gradient(to_bottom,#050506,#2c2d31_55%,#0e0e10)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]" />
            {/* base : plateau du clavier en perspective, bord avant biseauté et brillant, encoche de prise en main */}
            <div aria-hidden="true" className="relative mx-auto w-[111%] -translate-x-[5.5%]">
              <div className={`relative h-0 pb-[8.2%] [clip-path:polygon(7%_0,93%_0,100%_100%,0_100%)] ${BODY}`}>
                <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.1),transparent_30%)]" />
                {/* touches suggérées */}
                <span className="absolute inset-x-[12%] top-[14%] h-[38%] bg-[repeating-linear-gradient(to_right,rgba(255,255,255,0.07)_0_5px,transparent_5px_8px)] [mask-image:repeating-linear-gradient(to_bottom,#000_0_5px,transparent_5px_8px)] opacity-70" />
                {/* trackpad */}
                <span className="absolute bottom-[8%] left-1/2 h-[26%] w-[24%] -translate-x-1/2 rounded-[3px] border border-white/10 bg-white/[0.03]" />
                {/* bord avant brillant */}
                <span className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]" />
              </div>
              <span className="absolute bottom-0 left-1/2 h-[2px] w-[11%] -translate-x-1/2 rounded-t-full bg-black/70" />
            </div>
            <div aria-hidden="true" className="mx-auto mt-[0.8%] h-[2%] w-[78%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.07),transparent_70%)]" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Téléphone : titane noir, contour lumineux, Dynamic Island, boutons latéraux visibles. Écran 390 x 844. */
export function DeviceIphone({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  const btn = "absolute w-[2.2%] rounded-sm bg-[linear-gradient(to_right,#55555c,#1d1d20)] shadow-[0_0_0_1px_rgba(255,255,255,0.12)]";
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[9/19.5]">
          <Photo src={image} />
          <div className="absolute inset-[3%] overflow-hidden rounded-[12%/5.6%]"><Screen w={390} h={844}>{children}</Screen></div>
        </div>
      ) : (
        <div className="relative">
          <span aria-hidden="true" className={`${btn} -left-[1.6%] top-[15%] h-[3.6%]`} />
          <span aria-hidden="true" className={`${btn} -left-[1.6%] top-[21%] h-[6.5%]`} />
          <span aria-hidden="true" className={`${btn} -left-[1.6%] top-[29%] h-[6.5%]`} />
          <span aria-hidden="true" className={`${btn} -right-[1.6%] top-[25%] h-[10%] bg-[linear-gradient(to_left,#55555c,#1d1d20)]`} />
          <div className={`relative rounded-[17%/7.8%] p-[1.5px] ${METAL_EDGE} shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_60px_-10px_rgba(255,255,255,0.1)]`}>
            <div className="relative rounded-[16.5%/7.6%] bg-[linear-gradient(160deg,#2b2b30_0%,#121214_55%,#0a0a0c_100%)] p-[2.6%] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_0_0_1px_rgba(255,255,255,0.06)]">
              <div className="relative aspect-[390/844] overflow-hidden rounded-[14.5%/6.7%] bg-black ring-[3px] ring-black">
                <span aria-hidden="true" className="absolute left-1/2 top-[1.6%] z-20 h-[3.2%] w-[28%] -translate-x-1/2 rounded-full bg-black" />
                <Screen w={390} h={844}>{children}</Screen>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Montre : boîtier alu noir minuit, écran carré aux angles arrondis, couronne et bouton latéral, bracelet sport complet. Écran 184 x 224. */
export function DeviceWatch({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  const strap = "absolute left-1/2 w-[62%] -translate-x-1/2 bg-[linear-gradient(to_right,#101012,#34353a_50%,#101012)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]";
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <WatchPhoto image={image}>{children}</WatchPhoto>
      ) : (
        <div className="relative mx-auto w-full">
          {/* bracelet sport, entier (perforations suggérées) */}
          <div aria-hidden="true" className={`${strap} top-[-26%] h-[34%] rounded-t-[34%]`}>
            <span className="absolute inset-x-[34%] top-[16%] h-[40%] bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1.2px,transparent_1.6px)] [background-size:100%_33%]" />
          </div>
          <div aria-hidden="true" className={`${strap} bottom-[-26%] h-[34%] rounded-b-[34%]`}>
            <span className="absolute inset-x-[34%] bottom-[16%] h-[40%] bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1.2px,transparent_1.6px)] [background-size:100%_33%]" />
          </div>
          {/* couronne et bouton latéral */}
          <span aria-hidden="true" className="absolute -right-[5%] top-[22%] h-[17%] w-[7%] rounded-r-md bg-[repeating-linear-gradient(to_bottom,#55555c_0_2px,#1a1a1d_2px_4px)] shadow-[0_0_0_1px_rgba(255,255,255,0.14)]" />
          <span aria-hidden="true" className="absolute -right-[4%] top-[50%] h-[11%] w-[5%] rounded-r-sm bg-[#2a2a2e] shadow-[0_0_0_1px_rgba(255,255,255,0.14)]" />
          <div className={`relative rounded-[28%] p-[1.5px] ${METAL_EDGE} shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_50px_-10px_rgba(255,255,255,0.1)]`}>
            <div className="relative rounded-[27.5%] bg-[linear-gradient(150deg,#2f3035_0%,#121315_55%,#09090b_100%)] p-[5.5%] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
              <div className="relative aspect-[184/224] overflow-hidden rounded-[22%] bg-black ring-2 ring-black">
                <Screen w={184} h={224}>{children}</Screen>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tablette en paysage : alu noir, contour métallique, bords fins, caméra discrète. Écran 1180 x 820. */
export function DeviceIpad({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[4/3]">
          <Photo src={image} />
          <div className="absolute inset-[6%] overflow-hidden rounded-[2%]"><Screen w={1180} h={820}>{children}</Screen></div>
        </div>
      ) : (
        <div className={`relative rounded-[3.6%/5%] p-[1.5px] ${METAL_EDGE} shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_70px_-10px_rgba(255,255,255,0.08)]`}>
          <div className="relative rounded-[3.5%/4.8%] bg-[linear-gradient(160deg,#2b2c31_0%,#121315_50%,#09090b_100%)] p-[1.8%] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <span aria-hidden="true" className="absolute left-[0.7%] top-1/2 h-[1.6%] w-[0.6%] -translate-y-1/2 rounded-full bg-white/10" />
            <div className="relative aspect-[1180/820] overflow-hidden rounded-[1.8%/2.6%] bg-black ring-2 ring-black">
              <Screen w={1180} h={820}>{children}</Screen>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/** Homographie : transforme le rectangle (0,0)-(w,h) en quadrilatère `dst` (TL, TR, BR, BL). Renvoie une matrice CSS matrix3d. */
function quadMatrix(w: number, h: number, dst: [number, number][]) {
  const src: [number, number][] = [[0, 0], [w, 0], [w, h], [0, h]];
  const A: number[][] = [];
  const B: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    B.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    B.push(v);
  }
  // Élimination de Gauss
  const n = 8;
  for (let i = 0; i < n; i++) {
    let m = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]];
    [B[i], B[m]] = [B[m], B[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      B[r] -= f * B[i];
    }
  }
  const X = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = B[i];
    for (let c = i + 1; c < n; c++) sum -= A[i][c] * X[c];
    X[i] = sum / A[i][i];
  }
  const [a, b, c, d, e, f, g, hh] = X;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
}

// Vitre de la montre dans la photo (1000 x 1000) : coins haut-gauche, haut-droite, bas-droite, bas-gauche.
const WATCH_GLASS: [number, number][] = [[164, 253], [443, 285], [447, 723], [153, 746]];
const WATCH_MATRIX = quadMatrix(184, 224, WATCH_GLASS);

/** Apple Watch Ultra (coque et bracelet noirs) en photo : l'écran du Contrôle à distance est plaqué sur la vitre, en perspective. */
function WatchPhoto({ image, children }: { image: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / 1000));
    ro.observe(el);
    setK(el.clientWidth / 1000);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative aspect-square w-full overflow-hidden">
      <div style={{ width: 1000, height: 1000, transform: `scale(${k || 0.0001})`, transformOrigin: "top left" }} className={k ? "" : "invisible"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" width={1000} height={1000} className="absolute inset-0 block h-full w-full" />
        <div style={{ position: "absolute", left: 0, top: 0, width: 184, height: 224, transformOrigin: "0 0", transform: WATCH_MATRIX }} className="overflow-hidden rounded-[34px] bg-black">
          <Screen w={184} h={224}>{children}</Screen>
        </div>
      </div>
    </div>
  );
}
