// Fonctions activables par variable d'environnement (Vercel). Désactivées par défaut.

/** SYXTEE Cam : en pause (« Bientôt disponible »). Le code reste en place ; FEATURE_CAM=true pour la rouvrir. */
export const FEATURE_CAM = process.env.FEATURE_CAM === "true";
