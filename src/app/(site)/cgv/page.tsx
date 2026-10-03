import type { Metadata } from "next";
import Link from "next/link";
import { LegalBlock, LegalPage } from "@/components/LegalPage";
import { CATALOG, TIERS } from "@/lib/billing";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Conditions générales de vente", alternates: { canonical: "/cgv" } };

// ⚠️ Brouillon : complète les champs [À COMPLÉTER] et fais relire (association, vente d'abonnements aux particuliers)
// avant d'ouvrir le paiement en mode live.
export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente" updated="[À COMPLÉTER]">
      <LegalBlock title="1. Vendeur">
        <p>
          {site.name}, association [À COMPLÉTER : loi 1901, numéro RNA, adresse du siège]. Contact : Discord SYXTEE. Voir les{" "}
          <Link href="/mentions-legales" className="text-foreground underline">
            mentions légales
          </Link>
          .
        </p>
      </LegalBlock>
      <LegalBlock title="2. Objet">
        <p>
          Ces conditions encadrent la souscription aux formules Basique, Premium et Extra : accès aux relais SYXTEE (SRTLA, RTMP et RIST) et aux
          fonctions du dashboard, dans les limites de la formule choisie, décrites sur la page{" "}
          <Link href="/acces" className="text-foreground underline">
            Offres
          </Link>
          . Elles complètent les{" "}
          <Link href="/cgu" className="text-foreground underline">
            conditions d&apos;utilisation
          </Link>
          .
        </p>
      </LegalBlock>
      <LegalBlock title="3. Prix">
        <p>
          {TIERS.map((t) => `${CATALOG[t].name} : ${CATALOG[t].prices.month.amount} par mois ou ${CATALOG[t].prices.year.amount} par an`).join(" ; ")}. Prix nets, TVA non
          applicable [À COMPLÉTER : article du CGI
          applicable à l&apos;association]. Toute évolution de prix est annoncée au moins 30 jours avant le renouvellement concerné ; tu peux résilier avant
          qu&apos;elle ne s&apos;applique.
        </p>
      </LegalBlock>
      <LegalBlock title="4. Paiement">
        <p>
          Le paiement est traité par Stripe. {site.name} ne voit ni ne conserve tes données de carte. Le premier prélèvement a lieu à la souscription,
          puis à chaque échéance (mois ou année). Une facture est envoyée par email à chaque paiement.
        </p>
      </LegalBlock>
      <LegalBlock title="5. Durée et résiliation">
        <p>
          L&apos;abonnement est sans engagement et se renouvelle automatiquement. Tu peux le résilier à tout moment depuis Dashboard, puis Abonnement,
          puis « Gérer mon abonnement ». L&apos;accès reste ouvert jusqu&apos;à la fin de la période payée ; aucune période commencée n&apos;est
          remboursée. Ensuite, le compte repasse en formule Gratuit : les relais sont conservés, mais mis en pause. Un changement de formule en cours de période est calculé au prorata par Stripe.
        </p>
      </LegalBlock>
      <LegalBlock title="6. Droit de rétractation">
        <p>
          Le service démarre dès le paiement. En cochant la case prévue lors du paiement, tu demandes expressément cet accès immédiat et tu renonces à ton
          droit de rétractation de 14 jours (article L221-28 du Code de la consommation).
        </p>
      </LegalBlock>
      <LegalBlock title="7. Défaut de paiement">
        <p>
          Si un prélèvement échoue, Stripe réessaie pendant quelques jours et tu es prévenu par email. Sans paiement au terme de ces relances,
          l&apos;abonnement prend fin et le compte repasse en formule Gratuit.
        </p>
      </LegalBlock>
      <LegalBlock title="8. Service">
        <p>
          Nous faisons notre possible pour que le service reste disponible, sans garantie de continuité (voir les conditions d&apos;utilisation). En cas
          d&apos;abus, un compte peut être suspendu.
        </p>
      </LegalBlock>
      <LegalBlock title="9. Droit applicable et litiges">
        <p>Droit français. En cas de litige, écris-nous d&apos;abord sur Discord. [À COMPLÉTER : médiateur de la consommation]</p>
      </LegalBlock>
    </LegalPage>
  );
}
