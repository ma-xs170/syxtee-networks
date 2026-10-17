import Image from "next/image";

// Pages de connexion et d'inscription : le logo s'affiche tout de suite, le formulaire prend la place dès qu'il est prêt.
export default function AuthLoading() {
  return (
    <div role="status" aria-label="Chargement" className="grid min-h-dvh place-items-center">
      <Image src="/logo-400.png" alt="" width={36} height={50} style={{ width: 36, height: "auto" }} className="ink-img logo-load" priority />
    </div>
  );
}
