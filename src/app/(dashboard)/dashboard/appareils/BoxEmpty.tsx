"use client";

import RelayBox from "@/components/landing/RelayBox";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** État vide des boîtiers : visuel du boîtier, « Aucun Encodeur lié », bouton « Lier un boîtier » (le pairing arrive avec le produit). */
export default function BoxEmpty() {
  const toast = useToast();
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="w-full max-w-xs opacity-90">
        <RelayBox live={false} leds={{ "4g": "off", "5g": "off", esim: "off", sat: "off" }} />
      </div>
      <h2 className="mt-6 text-lg font-semibold tracking-tight">Aucun Encodeur lié</h2>
      <p className="mt-2 max-w-[46ch] text-sm leading-relaxed text-muted">L'Encodeur est en développement. Dès sa sortie, tu le lieras ici avec un code : état, signal de chaque modem, firmware et redémarrage à distance.</p>
      <div className="mt-6">
        <Button disabled title="Bientôt disponible" onClick={() => toast("Bientôt disponible.")}>Lier un Encodeur</Button>
      </div>
    </div>
  );
}
