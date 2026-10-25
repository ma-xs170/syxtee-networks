import Image from "next/image";
import { DeviceIphone } from "../devices/Devices";

// Téléphone de présentation : la vraie capture de l'interface du contrôle à distance (scripts/capture-remote-phone.mjs), sur l'onglet demandé. Marges haute et basse : l'île dynamique et la barre d'accueil ne masquent pas l'interface.
export type PhoneTab = "scenes" | "sources" | "mixer" | "controls";
const SHOT: Record<PhoneTab, { src: string; alt: string }> = {
  scenes: { src: "/images/remote/controle-mobile-v3.png", alt: "Contrôle à distance sur téléphone : aperçu du programme et liste des scènes" },
  sources: { src: "/images/remote/controle-mobile-v3-sources.png", alt: "Contrôle à distance sur téléphone : sources de la scène avec l'œil pour les afficher ou les masquer" },
  mixer: { src: "/images/remote/controle-mobile-v3-mixer.png", alt: "Contrôle à distance sur téléphone : mélangeur audio avec un curseur par piste" },
  controls: { src: "/images/remote/controle-mobile-v3-controles.png", alt: "Contrôle à distance sur téléphone : démarrer ou terminer le direct, enregistrer, débit du flux" },
};

export default function RemotePhone({ tab, className = "" }: { tab: PhoneTab; className?: string }) {
  const s = SHOT[tab];
  return (
    <DeviceIphone className={className}>
      <div className="h-full w-full bg-black pb-[14px] pt-[50px]"><Image src={s.src} alt={s.alt} width={780} height={1688} sizes="320px" className="h-full w-full object-contain object-top" /></div>
    </DeviceIphone>
  );
}
