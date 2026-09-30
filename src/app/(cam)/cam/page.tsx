import CamClient from "@/components/cam/CamClient";
import CamSoon from "@/components/cam/CamSoon";
import { hasCore, publicCoreUrl } from "@/lib/core";
import { FEATURE_CAM } from "@/lib/features";

// Lien caméra : /cam?k=cam_… (QR code du dashboard). La clé est ensuite retenue sur le téléphone.
// En pause (FEATURE_CAM=false) : page « Bientôt disponible », défilable dans le cadre plein écran de /cam.
export default function CamPage() {
  if (!FEATURE_CAM || !hasCore)
    return (
      <div className="h-full overflow-y-auto">
        <CamSoon />
      </div>
    );
  return <CamClient coreUrl={publicCoreUrl} />;
}
