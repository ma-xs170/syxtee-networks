// Tarifs du devis automatique (page Contact). Montants en centimes d'euro, TVA non applicable (art. 293 B du CGI).
// À ajuster ici : le formulaire, l'estimation affichée et le calcul côté serveur lisent tous ce fichier.
export const RATES = {
  /** Diffusion en direct : nos serveurs et la supervision du réseau. Par heure de direct (1 h minimum). 2 h = 50 €. */
  streamPerHour: 2500,
  /** Bonding SRTLA et régisseur à distance. Par heure de direct. */
  remotePerHour: 1000,
  /** Vidéaste sur place (frais d'heure). Par heure, 2 h minimum. */
  crewPerHour: 2500,
  crewMinHours: 2,
  /** Préparation et installation du vidéaste, comptées en plus de la durée du direct. */
  crewPrepHours: 1,
  /** Déplacement du vidéaste, du domicile au lieu : par kilomètre, aller-retour compris. */
  travelPerKm: 50,
  /** Liaison internet haut débit de secours (abonnement que nous payons), par direct. */
  linkPerLive: 1500,
  /** eSIM de données, par direct. */
  esimPerLive: 500,
} as const;

export const LIMITS = { maxLives: 20, maxHours: 24, maxKm: 2000 } as const;
