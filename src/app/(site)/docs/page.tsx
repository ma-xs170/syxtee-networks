import type { Metadata } from "next";
import CloudBackdrop from "@/components/home/CloudBackdrop";
import DocsBrowser, { type Section } from "@/components/docs/DocsBrowser";
import Highlight from "@/components/ui/Highlight";

export const metadata: Metadata = {
  title: "Documentation",
  description: "La documentation SYXTEE NETWORKS : démarrer en IRL, relais SRTLA et RTMP, Moblin, Starlink, eSIM Saily, contrôle à distance d'OBS et FAQ.",
  alternates: { canonical: "/docs" },
};

// Point d'entrée unique : les anciens menus du site (Produits, Outils, Ressources) sont rangés ici par thème.
const sections: Section[] = [
  {
    title: "Démarrer",
    guides: [
      { href: "/fonctionnement", title: "Fonctionnement", text: "Le trajet d'un live de A à Z, du téléphone à ton OBS.", icon: "route", keywords: "trajet live bonding srt obs" },
      { href: "/relais", title: "Relais SYXTEE", text: "Choisir ton serveur (SRTLA ou RTMP) et savoir à quelle latence t'attendre.", icon: "rack", keywords: "serveur srtla rtmp latence url" },
      { href: "/services", title: "Services", text: "Tout ce que fait le relais pour ton direct.", icon: "services", keywords: "fonctions relais" },
      { href: "/moblin", title: "Moblin", text: "Installer l'app IRL et la brancher sur le relais SYXTEE.", icon: "phone", keywords: "iphone app irl srtla" },
    ],
  },
  {
    title: "Réseau",
    guides: [
      { href: "/starlink", title: "Starlink", text: "Streamer là où la 4G ne passe plus, avec une antenne satellite.", icon: "dish", keywords: "satellite mini antenne forfait" },
      { href: "/saily", title: "Saily", text: "Ajouter une 4G de plus à ton bonding avec une eSIM.", icon: "esim", keywords: "esim 4g operateur", badge: "Partenaire" },
    ],
  },
  {
    title: "Aide",
    guides: [{ href: "/faq", title: "FAQ", text: "Batterie, data, OBS, Android : les réponses aux questions fréquentes.", icon: "faq", keywords: "questions batterie data android" }],
  },
];

export default function DocsPage() {
  return (
    <DocsBrowser
      sections={sections}
      backdrop={<CloudBackdrop />}
      title={
        <>
          <h1 className="h-hero mx-auto max-w-3xl">
            La <Highlight>documentation.</Highlight>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg">Tout pour passer du premier réglage au premier live.</p>
        </>
      }
    />
  );
}
