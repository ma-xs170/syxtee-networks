// Catégories des demandes de support : choisies à l'ouverture, filtrées dans la boîte admin (une pastille par catégorie).
export const SUPPORT_CATEGORIES = [
  { id: "relais", label: "Relais et connexion", hint: "Moblin, OBS, URLs, coupures, latence" },
  { id: "compte", label: "Compte et accès", hint: "Connexion, email, accès, partenaire" },
  { id: "facturation", label: "Abonnement et paiement", hint: "Formule, facture, remboursement" },
  { id: "bug", label: "Bug sur le site", hint: "Une page ou un bouton ne marche pas" },
  { id: "suggestion", label: "Suggestion", hint: "Une idée pour améliorer SYXTEE" },
  { id: "autre", label: "Autre", hint: "Tout le reste" },
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]["id"];
export const isCategory = (v: unknown): v is SupportCategory => SUPPORT_CATEGORIES.some((c) => c.id === v);
export const categoryLabel = (id: string) => SUPPORT_CATEGORIES.find((c) => c.id === id)?.label ?? "Autre";

/** Photos d'un message : au plus 4, 4 Mo chacune (réduites dans le navigateur avant l'envoi). */
export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * Formulaire propre à chaque catégorie : les champs précisent le problème pour qu'un agent puisse répondre sans poser dix questions.
 * Les réponses sont ajoutées en tête du premier message (« Libellé : valeur »). Validées côté serveur contre cette liste.
 */
export type FormField = { name: string; label: string; type: "text" | "select"; options?: string[]; placeholder?: string; required?: boolean };
export type CategoryForm = { title: string; intro: string; subjectPlaceholder: string; messageLabel: string; messagePlaceholder: string; fields: FormField[]; tips: string[] };

const APPAREILS = ["iPhone", "Android", "Caméra de poche", "Encodeur", "Ordinateur", "Autre"];

export const CATEGORY_FORMS: Record<SupportCategory, CategoryForm> = {
  relais: {
    title: "Serveur et connexion",
    intro: "Un souci pour envoyer ton direct ? Donne-nous le contexte : on regarde ton serveur côté SYXTEE.",
    subjectPlaceholder: "Ex. : mon serveur ne se connecte pas",
    messageLabel: "Que se passe-t-il ?",
    messagePlaceholder: "Décris le problème, à quel moment il arrive et ce que tu as déjà essayé.",
    fields: [
      { name: "appareil", label: "Appareil de diffusion", type: "select", options: APPAREILS, required: true },
      { name: "appli", label: "Application utilisée", type: "text", placeholder: "Ex. : Moblin 2.4, OBS 30" },
      { name: "protocole", label: "Protocole", type: "select", options: ["SRTLA", "RTMP", "Je ne sais pas"] },
      { name: "reseau", label: "Réseau", type: "select", options: ["4G", "5G", "Wi-Fi", "Plusieurs connexions", "Satellite", "Je ne sais pas"] },
      { name: "quand", label: "Quand ça arrive", type: "select", options: ["Tout le temps", "Par moments", "Au démarrage", "Pendant le direct"] },
    ],
    tips: ["Note l'heure approximative du souci.", "Ne partage jamais ton adresse complète ni ta clé."],
  },
  compte: {
    title: "Compte et accès",
    intro: "Connexion, e-mail, mot de passe, droits : dis-nous ce qui bloque.",
    subjectPlaceholder: "Ex. : je ne reçois pas l'e-mail de confirmation",
    messageLabel: "Explique la situation",
    messagePlaceholder: "Ce que tu essaies de faire, le message affiché et depuis quand.",
    fields: [
      { name: "probleme", label: "Type de problème", type: "select", options: ["Connexion impossible", "E-mail non reçu", "Mot de passe", "Changer d'adresse e-mail", "Droits ou accès", "Supprimer mon compte", "Autre"], required: true },
      { name: "methode", label: "Méthode de connexion", type: "select", options: ["E-mail et mot de passe", "Twitch", "Discord", "Google", "Je ne sais pas"] },
      { name: "appareil", label: "Appareil", type: "select", options: ["Ordinateur", "iPhone", "Android", "Autre"] },
    ],
    tips: ["Pour un e-mail non reçu, regarde aussi les courriers indésirables.", "Ne donne jamais ton mot de passe."],
  },
  facturation: {
    title: "Abonnement et paiement",
    intro: "Formule, facture, prélèvement ou remboursement : précise ta demande.",
    subjectPlaceholder: "Ex. : changer de formule",
    messageLabel: "Détaille ta demande",
    messagePlaceholder: "La formule concernée, la date du paiement et ce que tu souhaites.",
    fields: [
      { name: "sujet", label: "Sujet", type: "select", options: ["Changer de formule", "Résilier", "Facture", "Paiement refusé", "Remboursement", "Autre"], required: true },
      { name: "formule", label: "Formule actuelle", type: "select", options: ["Essentiel", "Signature", "Prestige", "Aucune"] },
      { name: "date", label: "Date du paiement concerné", type: "text", placeholder: "Ex. : 5 octobre" },
    ],
    tips: ["Ne partage jamais ton numéro de carte.", "Les prix sont indiqués sans TVA."],
  },
  bug: {
    title: "Bug sur le site",
    intro: "Une page ou un bouton ne marche pas : aide-nous à le reproduire.",
    subjectPlaceholder: "Ex. : le bouton Enregistrer ne répond pas",
    messageLabel: "Ce qui se passe",
    messagePlaceholder: "Ce que tu as fait, ce que tu attendais et ce qui s'est passé à la place.",
    fields: [
      { name: "page", label: "Page concernée", type: "text", placeholder: "Ex. : Serveurs, Contrôle à distance", required: true },
      { name: "appareil", label: "Appareil", type: "select", options: ["Ordinateur", "iPhone", "Android", "Tablette"], required: true },
      { name: "navigateur", label: "Navigateur", type: "select", options: ["Chrome", "Safari", "Firefox", "Edge", "Autre"] },
      { name: "frequence", label: "Fréquence", type: "select", options: ["À chaque fois", "Parfois", "Une seule fois"] },
    ],
    tips: ["Ajoute une capture d'écran : elle vaut mille mots.", "Dis si un message d'erreur s'affiche."],
  },
  suggestion: {
    title: "Suggestion",
    intro: "Une idée pour améliorer SYXTEE ? On lit tout.",
    subjectPlaceholder: "Ex. : ajouter un mode clair au contrôle à distance",
    messageLabel: "Ton idée",
    messagePlaceholder: "Ce que tu voudrais, et le problème que ça résoudrait pour toi.",
    fields: [
      { name: "zone", label: "Partie concernée", type: "select", options: ["Contrôle à distance", "Multistream", "Serveurs", "Équipe et espaces partagés", "Tableau de bord", "Site", "Autre"] },
      { name: "importance", label: "Importance pour toi", type: "select", options: ["Un plus", "Utile", "Indispensable"] },
    ],
    tips: ["Explique le besoin plus que la solution."],
  },
  autre: {
    title: "Autre demande",
    intro: "Une question qui ne rentre dans aucune catégorie : écris-nous.",
    subjectPlaceholder: "Ex. : une question sur mon projet",
    messageLabel: "Ton message",
    messagePlaceholder: "Dis-nous tout.",
    fields: [],
    tips: ["Pour un devis événementiel, utilise la page Contacter."],
  },
};
