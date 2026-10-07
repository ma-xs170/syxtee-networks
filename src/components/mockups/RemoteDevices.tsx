import Image from "next/image";

// Le contrôle à distance sur ses deux écrans : un ordinateur (l'interface complète, comme dans OBS) et un téléphone posé devant.
// Les deux écrans sont de vraies captures de l'interface (scripts/capture-remote-phone.mjs, faux Core), aux bonnes proportions : rien de rogné.
// Les cadres sont dessinés en CSS, teintés par les couleurs du thème.

export default function RemoteDevices({ className = "" }: { className?: string }) {
  return (
    <div className={`relative mx-auto w-full max-w-2xl pb-14 pr-[6%] ${className}`}>
      {/* Ordinateur */}
      <div className="relative">
        <div className="rounded-t-[1.1rem] rounded-b-md border-[1.5px] border-foreground/70 bg-black p-[1.8%] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[0.4rem] bg-black">
            <Image src="/images/remote/controle-bureau.png" alt="Contrôle à distance sur ordinateur : aperçu du programme, scènes, sources, mixeur audio et contrôles du direct" fill sizes="(min-width: 1024px) 640px, 92vw" className="object-cover object-top" />
          </div>
          <span aria-hidden="true" className="absolute left-1/2 top-[0.55%] size-1 -translate-x-1/2 rounded-full bg-foreground/40" />
        </div>
        {/* Base */}
        <div aria-hidden="true" className="relative mx-auto -mt-px h-3 w-[108%] -translate-x-[3.7%] rounded-b-[1.2rem] border-[1.5px] border-t-0 border-foreground/70 bg-surface">
          <span className="absolute left-1/2 top-0 h-1 w-[16%] -translate-x-1/2 rounded-b-md border border-t-0 border-foreground/40" />
        </div>
      </div>

      {/* Téléphone */}
      <div className="absolute -bottom-1 right-0 w-[23%] min-w-[5.5rem]">
        <div className="relative w-full rounded-[18%/8.3%] border-[1.5px] border-foreground/80 bg-black p-[4%] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)]" style={{ aspectRatio: "9 / 19.5" }}>
          <div className="relative h-full w-full overflow-hidden rounded-[14%/6.5%] bg-black">
            <Image src="/images/remote/controle-mobile.png" alt="Contrôle à distance sur téléphone : aperçu du programme et scènes" fill sizes="160px" className="object-cover object-top" />
            <div aria-hidden="true" className="absolute left-1/2 top-[2.2%] h-[3.4%] w-[30%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
          </div>
        </div>
      </div>
    </div>
  );
}
