// Fonctions activables par variable d'environnement (Vercel). Désactivées par défaut.

/** SYXTEE Cam : en pause (« Bientôt disponible »). Le code reste en place ; FEATURE_CAM=true pour la rouvrir. */
export const FEATURE_CAM = process.env.FEATURE_CAM === "true";

/** SYXTEE PRO (sac encodeur) : en pause, page « À venir » sur /pro. Le code reste en place ; FEATURE_PRO=true pour rouvrir la fiche produit. */
export const FEATURE_PRO = process.env.FEATURE_PRO === "true";
