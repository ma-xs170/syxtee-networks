"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Appareils génériques en SVG + CSS, toujours en coloris sombre (noir sidéral, titane noir, minuit). Ni logo, ni texte, ni marque gravés.
// Chaque appareil reçoit en enfant l'interface HTML réelle de l'écran (interactive) : l'écran est dessiné à taille fixe puis réduit par transform,
// pour garder le même ratio quel que soit le viewport. Si un rendu 3D est déposé dans /public/devices/, il remplace le cadre (props `image`).

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
    <div ref={box} className={`screen-on relative h-full w-full overflow-hidden bg-black ${className}`}>
      <div style={{ width: w, height: h, transform: `scale(${k || 0.0001})`, transformOrigin: "top left" }} className={k ? "" : "invisible"}>
        {children}
      </div>
      <span aria-hidden="true" className="device-glare pointer-events-none absolute inset-0" />
    </div>
  );
}

const RIM = "border border-white/[0.12]";
const METAL = "bg-[linear-gradient(160deg,#2a2b30_0%,#121316_45%,#0b0b0d_100%)]";

type Img = { image?: string | null };
const Photo = ({ src }: { src: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={src} alt="" className="absolute inset-0 h-full w-full object-contain" />
);

/** Ordinateur portable ouvert, vu légèrement de trois quarts : alu noir sidéral, encoche, charnière, clavier suggéré. Écran 1280 x 800. */
export function DeviceMac({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[16/10]">
          <Photo src={image} />
          <div className="absolute left-[13%] top-[8%] h-[62%] w-[74%]"><Screen w={1280} h={800}>{children}</Screen></div>
        </div>
      ) : (
        <div className="[perspective:1800px]">
          <div className="[transform:rotateY(-8deg)_rotateX(3deg)] [transform-style:preserve-3d]">
            <div className={`relative rounded-t-[1.4%/2.2%] ${RIM} ${METAL} p-[1%] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.18)]`}>
              <span aria-hidden="true" className="absolute left-1/2 top-[0.9%] z-20 h-[2.4%] w-[8%] -translate-x-1/2 rounded-b-[6px] bg-black" />
              <div className="relative aspect-[16/10] overflow-hidden rounded-[0.7%/1.1%] bg-black ring-1 ring-black">
                <Screen w={1280} h={800}>{children}</Screen>
              </div>
            </div>
            {/* charnière et base */}
            <div aria-hidden="true" className="relative mx-auto h-[1.4%] min-h-1 w-[102%] -translate-x-[1%] bg-[linear-gradient(to_bottom,#0a0a0c,#1c1d21)]" />
            <div aria-hidden="true" className={`relative mx-auto h-[3.6%] min-h-3 w-[106%] -translate-x-[3%] rounded-b-[50%/100%] ${RIM} border-t-0 bg-[linear-gradient(to_bottom,#26272b,#0e0e10)] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]`}>
              <span className="absolute left-1/2 top-0 h-[40%] w-[14%] -translate-x-1/2 rounded-b-md bg-black/50" />
            </div>
            <div aria-hidden="true" className="mx-auto mt-[0.6%] h-[1.4%] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05),transparent_70%)]" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Téléphone : titane noir, Dynamic Island, boutons latéraux fins. Écran 390 x 844. */
export function DeviceIphone({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[9/19.5]">
          <Photo src={image} />
          <div className="absolute inset-[3%] overflow-hidden rounded-[12%/5.6%]"><Screen w={390} h={844}>{children}</Screen></div>
        </div>
      ) : (
        <div className="relative">
          <span aria-hidden="true" className="absolute -left-[1.2%] top-[16%] h-[4%] w-[1.6%] rounded-l-sm bg-[#1b1b1e]" />
          <span aria-hidden="true" className="absolute -left-[1.2%] top-[23%] h-[7%] w-[1.6%] rounded-l-sm bg-[#1b1b1e]" />
          <span aria-hidden="true" className="absolute -left-[1.2%] top-[32%] h-[7%] w-[1.6%] rounded-l-sm bg-[#1b1b1e]" />
          <span aria-hidden="true" className="absolute -right-[1.2%] top-[27%] h-[11%] w-[1.6%] rounded-r-sm bg-[#1b1b1e]" />
          <div className={`relative rounded-[17%/7.8%] ${RIM} bg-[linear-gradient(160deg,#3b3b40_0%,#17171a_40%,#0c0c0e_100%)] p-[2.6%] shadow-[0_40px_80px_-25px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.22)]`}>
            <div className="relative aspect-[390/844] overflow-hidden rounded-[14.5%/6.7%] bg-black ring-[3px] ring-black">
              <span aria-hidden="true" className="absolute left-1/2 top-[1.6%] z-20 h-[3.2%] w-[28%] -translate-x-1/2 rounded-full bg-black" />
              <Screen w={390} h={844}>{children}</Screen>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Montre : boîtier alu noir minuit, écran carré aux angles arrondis, couronne et bouton latéral, bracelet sport anthracite. Écran 184 x 224. */
export function DeviceWatch({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[4/5]">
          <Photo src={image} />
          <div className="absolute left-[22%] top-[27%] h-[46%] w-[56%] overflow-hidden rounded-[22%]"><Screen w={184} h={224}>{children}</Screen></div>
        </div>
      ) : (
        <div className="relative mx-auto w-full">
          {/* bracelet */}
          <div aria-hidden="true" className="absolute left-1/2 top-[-18%] h-[30%] w-[64%] -translate-x-1/2 rounded-t-[30%] bg-[linear-gradient(to_bottom,#0b0b0d,#222327)]" />
          <div aria-hidden="true" className="absolute bottom-[-18%] left-1/2 h-[30%] w-[64%] -translate-x-1/2 rounded-b-[30%] bg-[linear-gradient(to_top,#0b0b0d,#222327)]" />
          {/* couronne et bouton */}
          <span aria-hidden="true" className="absolute -right-[4%] top-[24%] h-[16%] w-[6%] rounded-r-md bg-[repeating-linear-gradient(to_bottom,#2c2d31_0_2px,#141416_2px_4px)]" />
          <span aria-hidden="true" className="absolute -right-[3%] top-[50%] h-[10%] w-[4%] rounded-r-sm bg-[#1b1b1e]" />
          <div className={`relative rounded-[28%] ${RIM} bg-[linear-gradient(150deg,#34353a_0%,#141517_50%,#0a0a0c_100%)] p-[5.5%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2)]`}>
            <div className="relative aspect-[184/224] overflow-hidden rounded-[22%] bg-black ring-2 ring-black">
              <Screen w={184} h={224}>{children}</Screen>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tablette en paysage : alu noir, bords fins, caméra discrète. Écran 1180 x 820. */
export function DeviceIpad({ children, image, className = "" }: { children: ReactNode } & Img & { className?: string }) {
  return (
    <div className={`device-wrap relative w-full ${className}`}>
      {image ? (
        <div className="relative aspect-[4/3]">
          <Photo src={image} />
          <div className="absolute inset-[6%] overflow-hidden rounded-[2%]"><Screen w={1180} h={820}>{children}</Screen></div>
        </div>
      ) : (
        <div className={`relative rounded-[3.4%/4.6%] ${RIM} bg-[linear-gradient(160deg,#34353a_0%,#141517_50%,#0a0a0c_100%)] p-[1.8%] shadow-[0_40px_80px_-25px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.2)]`}>
          <span aria-hidden="true" className="absolute left-[0.7%] top-1/2 h-[1.6%] w-[0.6%] -translate-y-1/2 rounded-full bg-white/10" />
          <div className="relative aspect-[1180/820] overflow-hidden rounded-[1.8%/2.6%] bg-black ring-2 ring-black">
            <Screen w={1180} h={820}>{children}</Screen>
          </div>
        </div>
      )}
    </div>
  );
}
