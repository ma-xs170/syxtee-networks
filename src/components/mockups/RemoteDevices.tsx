import DeviceScene from "./Devices";

// Le contrôle à distance sur ses deux écrans : l'interface complète sur ordinateur, et sur le téléphone posé devant.
export default function RemoteDevices({ className = "" }: { className?: string }) {
  return (
    <DeviceScene
      className={className}
      main={{ src: "/images/remote/controle-bureau.png", alt: "Contrôle à distance sur ordinateur : aperçu du programme, scènes, sources, mixeur audio et contrôles du direct" }}
      phone={{ src: "/images/remote/controle-mobile.png", alt: "Contrôle à distance sur téléphone : aperçu du programme et scènes" }}
    />
  );
}
