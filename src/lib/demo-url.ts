// Adresse de la démo de l'Encodeur, ouverte dans un nouvel onglet depuis le dashboard de tous les comptes.
// Avec un sous-domaine (ex. https://encodeur.syxtee-networks.fr), définir NEXT_PUBLIC_ENCODER_DEMO_URL ; sinon la page locale /demo-encodeur est utilisée.
export const DEMO_URL = process.env.NEXT_PUBLIC_ENCODER_DEMO_URL || "/demo-encodeur";
