import Image from "next/image";

// Maquettes d'appareils : un ordinateur portable ou un grand écran, et un téléphone posé devant. Les écrans sont de vraies captures de
// l'interface (scripts/capture-remote-phone.mjs et scripts/capture-site-screens.mjs, données d'exemple), aux bonnes proportions : rien
// de rogné. Les cadres sont dessinés en CSS, teintés par les couleurs du thème. Même registre partout : sombre, sobre, réaliste.

type Shot = { src: string; alt: string };

function Screen({ shot, sizes, className = "" }: { shot: Shot; sizes: string; className?: string }) {
  return <Image src={shot.src} alt={shot.alt} fill sizes={sizes} className={`object-cover object-top ${className}`} />;
}

/** Ordinateur portable : écran 16:10, base fine. */
export function Laptop({ shot }: { shot: Shot }) {
  return (
    <div className="relative">
      <div className="relative rounded-t-[1.1rem] rounded-b-md border-[1.5px] border-foreground/70 bg-black p-[1.8%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[0.4rem] bg-black">
          <Screen shot={shot} sizes="(min-width: 1024px) 640px, 92vw" />
        </div>
        <span aria-hidden="true" className="absolute left-1/2 top-[0.55%] size-1 -translate-x-1/2 rounded-full bg-foreground/40" />
      </div>
      <div aria-hidden="true" className="relative mx-auto -mt-px h-3 w-[108%] -translate-x-[3.7%] rounded-b-[1.2rem] border-[1.5px] border-t-0 border-foreground/70 bg-surface">
        <span className="absolute left-1/2 top-0 h-1 w-[16%] -translate-x-1/2 rounded-b-md border border-t-0 border-foreground/40" />
      </div>
    </div>
  );
}

/** Grand écran sur pied : écran 16:10, bord fin, pied et socle. */
export function Display({ shot }: { shot: Shot }) {
  return (
    <div className="relative">
      <div className="rounded-[0.9rem] border-[1.5px] border-foreground/70 bg-black p-[1.2%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[0.45rem] bg-black">
          <Screen shot={shot} sizes="(min-width: 1024px) 700px, 92vw" />
        </div>
      </div>
      <div aria-hidden="true" className="mx-auto h-[3.4rem] w-[9%] min-w-10 border-x-[1.5px] border-foreground/60 bg-gradient-to-b from-foreground/15 to-foreground/5 [clip-path:polygon(12%_0,88%_0,100%_100%,0_100%)]" />
      <div aria-hidden="true" className="mx-auto h-[0.6rem] w-[26%] rounded-t-md rounded-b-[0.5rem] border-[1.5px] border-foreground/60 bg-surface" />
    </div>
  );
}

/** Téléphone, proportions 9:19,5, île dynamique. Se pose en bas à droite de l'appareil principal. */
export function Phone({ shot, className = "" }: { shot: Shot; className?: string }) {
  return (
    <div className={`w-[23%] min-w-[5.5rem] ${className}`}>
      <div className="relative w-full rounded-[18%/8.3%] border-[1.5px] border-foreground/80 bg-black p-[4%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)]" style={{ aspectRatio: "9 / 19.5" }}>
        <div className="relative h-full w-full overflow-hidden rounded-[14%/6.5%] bg-black">
          <Screen shot={shot} sizes="160px" />
          <div aria-hidden="true" className="absolute left-1/2 top-[2.2%] h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
        </div>
      </div>
    </div>
  );
}

/** Scène : un appareil principal (portable ou grand écran) et un téléphone devant, en bas à droite. */
export default function DeviceScene({ main, kind = "laptop", phone, className = "" }: { main: Shot; kind?: "laptop" | "display"; phone: Shot; className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-2xl pr-[6%] ${kind === "display" ? "pb-8" : "pb-14"} ${className}`}>
      {kind === "display" ? <Display shot={main} /> : <Laptop shot={main} />}
      <Phone shot={phone} className="absolute -bottom-1 right-0" />
    </div>
  );
}
