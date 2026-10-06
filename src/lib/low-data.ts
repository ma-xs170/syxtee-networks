// Mode « Connexion basse » : le choix vit dans un cookie (lu par le serveur et le proxy, donc rien de lourd n'est chargé).
export const LOW_DATA_COOKIE = "syxtee-low";
export const LOW_DATA_PAGE = "/dashboard/connexion-basse";
/** Pages du dashboard encore ouvertes en mode connexion basse (le reste redirige vers la page légère). */
export const LOW_DATA_ALLOWED = [LOW_DATA_PAGE, "/dashboard/parametres"];
