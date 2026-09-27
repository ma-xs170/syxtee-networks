import type { Metadata } from "next";
import Link from "next/link";
import { LegalBlock, LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Conditions d'utilisation", alternates: { canonical: "/cgu" } };

// ⚠️ Complète les champs [À COMPLÉTER] avant l'ouverture publique des comptes.
export default function CguPage() {
  return (
    <LegalPage title="Conditions d'utilisation" updated="[À COMPLÉTER]">
      <LegalBlock title="1. Objet">
        <p>
          Ces conditions encadrent l&apos;utilisation du site {site.name} et de l&apos;espace client (compte, profil, dashboard). En créant un compte ou
          en te connectant, tu les acceptes.
        </p>
      </LegalBlock>
      <LegalBlock title="2. Éditeur">
        <p>
          {site.name}, [À COMPLÉTER : forme juridique, SIRET, adresse]. Voir les <Link href="/mentions-legales" className="text-foreground underline">mentions légales</Link>.
        </p>
      </LegalBlock>
      <LegalBlock title="3. Compte">
        <p>
          La connexion se fait par lien envoyé par email, ou via Twitch, Discord ou Google. Tu dois avoir au moins [À COMPLÉTER : âge minimum, 15 ans
          recommandé en France] pour créer un compte. Tu es responsable de l&apos;accès à ta boîte mail et aux comptes utilisés pour te connecter.
        </p>
        <p>Un seul compte par personne. Le pseudo ne doit pas usurper l&apos;identité d&apos;un autre créateur ni être injurieux.</p>
      </LegalBlock>
      <LegalBlock title="4. Affichage de ta chaîne">
        <p>
          Si tu coches « Afficher ma chaîne sur le site SYXTEE », ton pseudo Twitch, ton avatar et ton statut en live apparaissent sur l&apos;accueil. Seul
          un Twitch lié par connexion Twitch peut être affiché. Tu peux décocher à tout moment.
        </p>
      </LegalBlock>
      <LegalBlock title="5. Services et disponibilité">
        <p>
          Les services (relais, dashboard, outils) sont fournis en l&apos;état. Nous faisons notre possible pour qu&apos;ils restent disponibles, sans
          garantie de continuité. Les conditions tarifaires des offres payantes sont précisées sur la page <Link href="/offres" className="text-foreground underline">Offres</Link>. [À COMPLÉTER si vente en ligne : conditions générales de vente]
        </p>
      </LegalBlock>
      <LegalBlock title="6. Usages interdits">
        <p>
          Interdits : contourner les limitations techniques, revendre l&apos;accès, diffuser des contenus illégaux via nos services, ou tenter d&apos;accéder
          au compte d&apos;un autre utilisateur. Nous pouvons suspendre un compte en cas d&apos;abus.
        </p>
      </LegalBlock>
      <LegalBlock title="7. Suppression du compte">
        <p>Tu peux supprimer ton compte à tout moment depuis la page Mon compte. La suppression est immédiate et définitive.</p>
      </LegalBlock>
      <LegalBlock title="8. Données personnelles">
        <p>
          Voir la <Link href="/confidentialite" className="text-foreground underline">politique de confidentialité</Link>.
        </p>
      </LegalBlock>
      <LegalBlock title="9. Droit applicable">
        <p>Droit français. [À COMPLÉTER : tribunal compétent / médiateur de la consommation si vente aux particuliers]</p>
      </LegalBlock>
      <LegalBlock title="10. Contact">
        <p>
          Via le{" "}
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
            serveur Discord
          </a>
          . [À COMPLÉTER : email de contact]
        </p>
      </LegalBlock>
    </LegalPage>
  );
}
