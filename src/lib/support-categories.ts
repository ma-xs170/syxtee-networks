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
