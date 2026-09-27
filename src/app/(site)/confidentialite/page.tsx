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
            un direct, ou en mode Scan de SYXTEE Cam, nous enregistrons la position GPS et sa précision, le débit montant, la latence, les pertes et
            l&apos;opérateur (déduit de l&apos;adresse IP grâce à la base IPinfo Lite).
          </p>
          <p>
            <strong className="text-foreground">Base légale :</strong> ton consentement, demandé séparément (case « Partager anonymement mes mesures de réseau
            pour la carte communautaire », décochée par défaut), vérifié par nos serveurs avant chaque enregistrement.
          </p>
          <p>
            <strong className="text-foreground">Anonymisation :</strong> les mesures ne contiennent ni ton nom ni ton identifiant de compte, seulement un
            identifiant d&apos;appareil chiffré qui change chaque mois. Rien n&apos;est enregistré dans tes zones privées (jusqu&apos;à 3 cercles) ni dans les 300
            premiers et derniers mètres de chaque session. Une zone n&apos;apparaît sur la carte qu&apos;avec au moins 3 contributeurs ou 20 mesures.
          </p>
          <p>
            <strong className="text-foreground">Durée :</strong> mesures détaillées 90 jours, puis seules les moyennes par zone (environ 0,1 km²) sont gardées.
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
          Pour toute autre demande : [À COMPLÉTER : email de contact] ou le{" "}
          <a href={site.discord} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
            serveur Discord
          </a>
          . Tu peux aussi saisir la CNIL (cnil.fr).
        </p>
      </LegalBlock>
    </LegalPage>
  );
}
