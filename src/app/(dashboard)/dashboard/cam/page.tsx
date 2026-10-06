import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import CamPanel from "@/components/cam/CamPanel";
import CamSoon from "@/components/cam/CamSoon";
import { ArrowLink, DashHeader, DashPage, Tile, TileLabel } from "@/components/dashboard/ui";
import { requireUser } from "@/lib/auth/dal";
import { getCam, hasCore, type CamInfo } from "@/lib/core";
import { FEATURE_CAM } from "@/lib/features";
import PlanGate from "@/components/plans/PlanGate";

export const metadata: Metadata = { title: "SYXTEE Cam", robots: { index: false } };

// Ce qui marche selon le téléphone (API du navigateur ; à confirmer par les tests réels, voir docs/cam-tests.md).
const COMPAT: [string, string, string][] = [
  ["Diffusion vidéo + son", "Oui", "Oui"],
  ["Objectif 0,5x", "Oui (grand-angle)", "Selon le téléphone"],
  ["Zoom 2x / 3x", "Téléobjectif s'il existe", "Oui (zoom de la caméra)"],
  ["Torche", "Non", "Oui"],
  ["Stabilisation", "Non : Safari ne l'expose pas (utilise Moblin)", "Selon le téléphone et Chrome"],
  ["Batterie affichée", "Non", "Oui"],
  ["Enregistrement sur le téléphone", "Oui", "Oui"],
  ["Écran toujours allumé", "Oui", "Oui"],
  ["Position GPS", "Page au premier plan", "Page au premier plan"],
];

export default async function CamPage() {
  const user = await requireUser("/dashboard/cam");
  // En pause : page « Bientôt disponible » (le code ci-dessous reste en place, FEATURE_CAM=true pour la rouvrir).
  if (!FEATURE_CAM) return <CamSoon />;
  let cam: CamInfo | null = null;
  let down = false;
  if (hasCore) {
    try {
      cam = await getCam(user.id);
    } catch (e) {
      console.error("dashboard/cam : Core", e);
      down = true;
    }
  }
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const link = cam ? `${origin}${cam.cam_path}` : "";
  const qr = cam ? await QRCode.toString(link, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } }) : "";

  return (
    <DashPage>
      <PlanGate feature="cam">
      <DashHeader lead="SYXTEE" hl="Cam" sub="Un téléphone devient une caméra de ton direct, en un scan. Il arrive dans OBS avec ta clé habituelle : aucune URL de plus." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Tile className="lg:col-span-2">
          <TileLabel>Lien caméra</TileLabel>
          <div className="mt-5">
            {!hasCore || down || !cam ? (
              <p className="text-sm text-muted">
                {down ? (
                  "Le relais ne répond pas pour le moment. Réessaie dans quelques minutes."
                ) : hasCore ? (
                  <>
                    SYXTEE Cam diffuse vers un de tes relais. Crée d&apos;abord un relais dans{" "}
                    <Link href="/dashboard/relais" className="text-foreground underline underline-offset-4">
                      Mes relais
                    </Link>
                    .
                  </>
                ) : (
                  "SYXTEE Cam n'est pas encore branchée au relais."
                )}
              </p>
            ) : (
              <CamPanel key={cam.cam_key} link={link} qrSvg={qr} />
            )}
          </div>
        </Tile>

        <div className="space-y-4">
          <Tile>
            <TileLabel>Dans OBS</TileLabel>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Rien à changer : la caméra arrive sur la source SRT {cam ? <>du relais « {cam.relay.name} »</> : "de ton relais"}. Ne diffuse pas en même temps depuis Moblin avec la même clé.
            </p>
            <div className="mt-4">
              <ArrowLink href="/dashboard/relais">Mes relais</ArrowLink>
            </div>
          </Tile>
          <Tile>
            <TileLabel>Une connexion, pas de bonding</TileLabel>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              SYXTEE Cam envoie sur le Wi-Fi ou la 4G du téléphone. Parfait pour une 2e caméra fixe, une interview ou un plan face cam. Pour l&apos;IRL
              en mouvement, garde Moblin et son bonding.
            </p>
          </Tile>
        </div>

        <Tile className="lg:col-span-3">
          <TileLabel>Selon ton téléphone</TileLabel>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-4 font-normal">Fonction</th>
                  <th className="py-2 pr-4 font-normal">iPhone (Safari)</th>
                  <th className="py-2 font-normal">Android (Chrome)</th>
                </tr>
              </thead>
              <tbody>
                {COMPAT.map(([f, ios, android]) => (
                  <tr key={f} className="border-t border-line">
                    <td className="py-2.5 pr-4">{f}</td>
                    <td className="py-2.5 pr-4 text-muted">{ios}</td>
                    <td className="py-2.5 text-muted">{android}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-muted">
            Si la connexion coupe, SYXTEE Cam se reconnecte seule. L&apos;écran de coupure dans OBS (mire) arrive avec le mode Régie.
          </p>
          <p className="mt-2 text-xs text-muted">Pour une stabilisation maximale en IRL sur iPhone, utilise Moblin avec ton relais SYXTEE.</p>
        </Tile>
      </div>
    </PlanGate>
    </DashPage>
  );
}
