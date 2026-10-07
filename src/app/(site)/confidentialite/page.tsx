import type { Metadata } from "next";
import { LegalBlock, LegalPage } from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

const rows = [
  { d: "Email", f: "Connexion (lien envoyé par email), messages liés au compte", b: "Exécution du service" },
  { d: "Identifiant du fournisseur de connexion (Twitch, Discord, Google)", f: "Connexion", b: "Exécution du service" },
  { d: "Pseudo, avatar, bio, pays, pseudos de réseaux sociaux", f: "Profil", b: "Exécution du service" },
  { d: "Identifiant et pseudo Twitch vérifiés", f: "Affichage de ta chaîne et de ton statut live sur l'accueil", b: "Consentement (case à cocher, date enregistrée)" },
  { d: "Adresse IP (compteurs anti-abus)", f: "Limiter les envois d'emails et les abus", b: "Intérêt légitime (sécurité)" },
];

// ⚠️ Complète les champs [À COMPLÉTER] avant l'ouverture publique des comptes.
export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité" updated="[À COMPLÉTER]">
      <LegalBlock title="Responsable du traitement">
        <p>{site.name}, [À COMPLÉTER : nom du responsable, adresse, email de contact].</p>
      </LegalBlock>

      <LegalBlock title="Données collectées et finalités">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="text-foreground">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Donnée</th>
                <th className="py-2 pr-4 font-medium">Finalité</th>
                <th className="py-2 font-medium">Base légale</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.d} className="align-top">
                  <td className="py-2 pr-4">{r.d}</td>
                  <td className="py-2 pr-4">{r.f}</td>
                  <td className="py-2">{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Aucune donnée n&apos;est vendue ni utilisée à des fins publicitaires.</p>
      </LegalBlock>

      <div id="couverture" className="scroll-mt-24">
        <LegalBlock title="Carte de couverture communautaire (optionnelle)">
          <p>
            <strong className="text-foreground">Finalité :</strong> construire une carte publique de la qualité du réseau mobile (où capter en 4G / 5G). Pendant
            un direct, ou avec le Scanner réseau du dashboard, partout dans le monde, nous enregistrons la position GPS, sa précision et la vitesse, les débits
            montant et descendant, la latence, les pertes, l&apos;opérateur et son numéro de réseau (ASN, déduits de l&apos;adresse IP grâce à la base IPinfo
            Lite) et le type de réseau (4G/5G, Wi-Fi, Starlink ou box, déduit du type de connexion du téléphone, du réseau IP et de l&apos;opérateur
            mobile que tu déclares, facultatif). L&apos;adresse IP elle-même n&apos;est pas enregistrée avec la mesure ; seul le bloc d&apos;adresses
            (/24 ou /48) est retenu, sans lien avec toi, pour reconnaître les réseaux Wi-Fi. Exception : si la base IPinfo est momentanément
            indisponible, l&apos;adresse IP est gardée à part, 14 jours au plus, le temps d&apos;identifier l&apos;opérateur, puis effacée. Nous
            vérifions aussi si l&apos;adresse fait partie des sorties du Relais privé iCloud (liste publique d&apos;Apple), sans rien enregistrer
            de plus. Les mesures en Wi-Fi ne sont jamais publiées.
          </p>
          <p>
            <strong className="text-foreground">Base légale :</strong> ton consentement, demandé séparément (case « Partager anonymement mes mesures de réseau
            pour la carte communautaire », décochée par défaut), vérifié par nos serveurs avant chaque enregistrement.
          </p>
          <p>
            <strong className="text-foreground">Anonymisation :</strong> les mesures ne contiennent ni ton nom ni ton identifiant de compte, seulement un
            identifiant d&apos;appareil chiffré qui change chaque mois. Rien n&apos;est enregistré dans tes zones privées (jusqu&apos;à 3 cercles), et la
            position exacte des 60 premières secondes de chaque session n&apos;est jamais écrite (seulement une zone d&apos;environ 0,7 km²). Une zone
            apparaît sur la carte dès 5 mesures, même d&apos;un seul contributeur, avec un indice de fiabilité : on n&apos;y publie alors que la moyenne,
            jamais de point, d&apos;heure exacte ni d&apos;identité, et les dates sont arrondies au mois.
          </p>
          <p>
            <strong className="text-foreground">Durée :</strong> mesures détaillées 90 jours, puis seules les moyennes par zone (de 0,015 à 0,7 km²) sont gardées.
            Le lien entre ton compte et les zones que tu as mesurées (programme de récompenses) est supprimé au bout de 90 jours.
          </p>
          <p>
            <strong className="text-foreground">Tes droits :</strong> tu peux décocher la case à tout moment (Dashboard → Paramètres) : la collecte s&apos;arrête
            en moins d&apos;une minute. Le bouton « Supprimer toutes mes mesures » les efface immédiatement, comme la suppression du compte.
          </p>
        </LegalBlock>
      </div>

      <LegalBlock title="Durée de conservation">
        <p>
          Données du compte : tant que le compte existe, puis supprimées immédiatement à la suppression du compte. Compteurs anti-abus (IP, email) : 24 heures
          maximum. [À COMPLÉTER : durée après laquelle un compte inactif est supprimé, par exemple 3 ans]
        </p>
      </LegalBlock>

      <LegalBlock title="Qui peut consulter tes données">
        <p>
          Seul le personnel habilité de SYXTEE NETWORKS y accède, pour le support et la sécurité (retrouver ton compte depuis ton ID support, couper un flux abusif,
          gérer ta formule). Cet accès est protégé par une double authentification, et chaque consultation ou modification est inscrite dans un journal
          d&apos;audit qui ne peut être ni modifié ni effacé.
        </p>
      </LegalBlock>

      <LegalBlock title="Sous-traitants">
        <p>
          Supabase (base de données et authentification, hébergée en [À COMPLÉTER : région UE choisie]), Vercel (hébergement du site), Resend (envoi des
          emails), Twitch (statut live, via son API publique). Selon ta méthode de connexion : Twitch, Discord ou Google.
        </p>
      </LegalBlock>

      <LegalBlock title="Cookies">
        <p>
          Uniquement des cookies nécessaires : la session de connexion. Le navigateur retient aussi ta dernière méthode de connexion (stockage local) pour
          l&apos;afficher sur la page de connexion. Aucun cookie publicitaire ni de mesure d&apos;audience.
        </p>
      </LegalBlock>

      <LegalBlock title="Tes droits">
        <p>
          Accès, rectification, effacement, opposition, limitation et portabilité. Tu modifies ton profil et retires ton consentement (case « Afficher ma
          chaîne ») à tout moment depuis la page Mon compte. Le bouton « Supprimer mon compte » efface immédiatement toutes tes données.
        </p>
        <p>
          Pour toute autre demande : contact@syxtee-networks.fr. Tu peux aussi saisir la CNIL (cnil.fr).
        </p>
      </LegalBlock>
    </LegalPage>
  );
}
