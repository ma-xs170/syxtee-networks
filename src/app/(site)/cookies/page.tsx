import type { Metadata } from "next";
import { LegalBlock, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Cookies", description: "Les cookies et le stockage local utilisés par SYXTEE NETWORKS : uniquement ce qui fait fonctionner le site, aucun traceur publicitaire ni mesure d'audience.", alternates: { canonical: "/cookies" } };

const rows = [
  { n: "Session de connexion", r: "Te garder connecté à ton compte (cookie du service d'authentification).", d: "Tant que la session est active" },
  { n: "lang", r: "Retenir la langue choisie (stockage local du navigateur).", d: "Jusqu'à effacement" },
  { n: "syx-member", r: "Savoir que tu as déjà un compte pour adapter les boutons (stockage local du navigateur).", d: "Jusqu'à effacement" },
];

export default function Cookies() {
  return (
    <LegalPage title="Cookies" updated="15 novembre 2026">
      <LegalBlock title="En bref">
        <p>Le site n&apos;utilise que des cookies et un stockage local nécessaires à son fonctionnement. Il n&apos;y a ni publicité, ni traceur tiers, ni outil de mesure d&apos;audience. Ces éléments étant strictement nécessaires, aucun bandeau de consentement n&apos;est affiché.</p>
      </LegalBlock>
      <LegalBlock title="Ce qui est enregistré dans ton navigateur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-foreground">
                <th className="py-2 pr-4 font-medium">Nom</th>
                <th className="py-2 pr-4 font-medium">Rôle</th>
                <th className="py-2 font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.n} className="border-b border-line align-top">
                  <td className="py-2 pr-4 font-mono text-foreground">{x.n}</td>
                  <td className="py-2 pr-4">{x.r}</td>
                  <td className="py-2">{x.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </LegalBlock>
      <LegalBlock title="Les supprimer">
        <p>Tu peux effacer les cookies et le stockage local dans les réglages de ton navigateur. Tu seras alors déconnecté et le site oubliera ta langue. Pour savoir quelles données personnelles sont collectées, lis la politique de confidentialité.</p>
      </LegalBlock>
    </LegalPage>
  );
}
