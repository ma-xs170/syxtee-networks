import CamClient from "@/components/cam/CamClient";
import { hasCore, publicCoreUrl } from "@/lib/core";

// Lien caméra : /cam?k=cam_… (QR code du dashboard). La clé est ensuite retenue sur le téléphone.
export default function CamPage() {
  if (!hasCore) return <p className="flex h-full items-center justify-center p-8 text-center text-sm text-white/70">SYXTEE Cam arrive bientôt.</p>;
  return <CamClient coreUrl={publicCoreUrl} />;
}
