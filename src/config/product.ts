// Source unique des produits : OBS CLOUD (contrôle à distance), SYXTEE Encodeur (le boîtier) et ses accessoires. Toute la landing, la boutique et le dashboard lisent ce fichier.
// Les valeurs marquées TODO À CONFIRMER sont plausibles, pas définitives : ne les présente jamais comme officielles.

export type Availability = "soon" | "preorder" | "available";

export const product = {
  brand: "SYXTEE NETWORKS",
  name: "SYXTEE Encodeur", // le boîtier
  remoteName: "Contrôle à distance", // le contrôle OBS à distance (produit n°1)
  tagline: "Branche ta caméra en HDMI. Diffuse de n'importe où. Sans te ruiner.",
  /** Positionnement : un « TVU » à petit prix, pour les streamers (pas pour la télévision). */
  pitch: "Le boîtier où tu branches ta caméra en HDMI. Il réunit ta 4G, ta 5G, ton Wi-Fi et un terminal satellite pour diffuser ton direct vers YouTube, Twitch ou Kick, sur terre, en mer ou dans les airs.",
  /** soon : « à venir » ; preorder : « Précommander » ; available : « Acheter ». */
  availability: "soon" as Availability,
  /** Prix en euros TTC, achat du boîtier. `null` : pas encore annoncé, le site affiche « Pas cher ». */
  price: 699 as number | null,
  /** Fabrication : artisanale, sur commande, en petite série. */
  madeToOrder: {
    title: "Tarif bas, quantités limitées.",
    text: "Chaque Encodeur est fabriqué sur commande, de façon artisanale : nous commandons les composants, puis nous assemblons le boîtier avec soin. C'est un appareil d'une très grande complexité, réalisé avec rigueur.",
    delay: "Délai de fabrication : 4 mois maximum.",
  },
  /** Formule avec abonnement : 60 € tous les 3 mois, soit 20 € par mois. */
  subscription: { perQuarter: 60, perMonth: 20 },
  priceLabel: (p: number | null) => (p === null ? "Pas cher" : `${p.toLocaleString("fr-FR", { minimumFractionDigits: p % 1 ? 2 : 0, maximumFractionDigits: 2 })} €`),
  discord: "https://discord.gg/CD68F8yZuZ",
  /** Mois offerts de l'abonnement le plus élevé à l'activation de l'Encodeur sur un compte (code à usage unique). */
  bonusMonths: 4,
  /** Pays livrés (codes ISO pour Stripe, drapeaux affichés sur le site). */
  shipping: [
    { cc: "FR", name: "France", flag: "🇫🇷" },
    { cc: "GP", name: "Guadeloupe", flag: "🇬🇵" },
    { cc: "MQ", name: "Martinique", flag: "🇲🇶" },
    { cc: "MF", name: "Saint-Martin", flag: "🇲🇫" },
  ],
  /** Où l'Encodeur fonctionne : partout où il y a du ciel ou un réseau. */
  anywhere: ["Sur un bateau", "Dans un hélicoptère", "En montagne", "Sur un marathon", "En plein désert", "Dans une foule"],
  specs: {
    /** Connexions simultanées intégrées. Une clé 4G USB ajoute une connexion de plus, sans limite autre que les ports. */
    simultaneous: 3,
    connections: ["Wi-Fi", "Ethernet (pour un terminal satellite)", "4G ou 5G"],
    usbModem: "Chaque clé 4G USB ajoute une connexion supplémentaire",
    camera: "Entrée HDMI : n'importe quelle caméra, hybride ou de poche, en 1080p60", // TODO À CONFIRMER : liste des caméras compatibles
    videoInput: "1080p60",
    latencyMs: 84, // TODO À CONFIRMER : latence moyenne de bout en bout
    protocols: ["SRTLA"], // TODO À CONFIRMER
    ports: ["Entrée HDMI", "Ethernet", "Port USB-C pour clé 4G", "Alimentation USB-C"], // TODO À CONFIRMER
    engraving: "SYXTEE NETWORKS gravé sur le boîtier",
    power: "USB-C PD, 15 W", // TODO À CONFIRMER : alimentation
    consumption: "8 W en charge", // TODO À CONFIRMER
    firmware: "0.1.0", // TODO À CONFIRMER
  },
  platforms: ["YouTube", "Twitch", "Kick"], // seules marques tierces autorisées sur le site public
  /** Variantes du boîtier. Une seule : une carte produit. */
  variants: [{ id: "standard", name: "SYXTEE Encodeur", pitch: "Le boîtier, prêt à brancher.", price: 699 as number | null, featured: true }],
  /** Accessoires vendus avec l'Encodeur. */
  accessories: [
    {
      id: "sac-mesh",
      name: "Sac Mesh",
      pitch: "Le sac pensé pour emporter l'Encodeur et un terminal satellite compact : tout est rangé, ventilé et prêt à diffuser.",
      price: null as number | null, // TODO À CONFIRMER : prix du Sac Mesh
      points: ["Compartiment ventilé pour un terminal satellite compact", "Poche dédiée à l'Encodeur, câbles protégés", "Panneau rigide qui s'ouvre vers le ciel", "SYXTEE NETWORKS brodé"], // TODO À CONFIRMER
    },
  ],
  /** Abonnement du contrôle à distance et de l'interface de l'Encodeur. Prix « bientôt disponible » tant que null. */
  plans: [
    { id: "free", name: "Gratuit", text: "1 relais et 1 flux pour essayer.", points: ["1 relais SRTLA", "50 Go de données par mois", "Santé du flux et mire de coupure"], price: null as number | null },
    { id: "paid", name: "Payant", text: "Direct stable, santé du flux et contrôle OBS à distance.", points: ["Direct stable en 4G et 5G", "Mire de coupure automatique", "Pilotage d'OBS depuis ton téléphone"], price: null as number | null, featured: true },
    { id: "partner", name: "Partenaire", text: "Pour les créateurs et les régies accompagnés.", points: ["Accès illimité", "Espaces partagés", "Contact direct"], price: null as number | null },
  ],
} as const;

export const ctaLabel = (a: Availability) => (a === "available" ? "Acheter" : a === "preorder" ? "Précommander" : "Être prévenu de la sortie");
export const fromPrice = () => {
  const p = product.variants.map((v) => v.price).filter((x): x is number => x !== null);
  return p.length ? `À partir de ${product.priceLabel(Math.min(...p))}` : "Pas cher";
};
