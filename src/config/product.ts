// Source unique des produits : OBS CLOUD (contrôle à distance), SYXTEE Encodeur (le boîtier) et ses accessoires. Toute la landing, la boutique et le dashboard lisent ce fichier.
// Les valeurs marquées TODO À CONFIRMER sont plausibles, pas définitives : ne les présente jamais comme officielles.

export type Availability = "soon" | "preorder" | "available";

export const product = {
  brand: "SYXTEE NETWORKS",
  name: "SYXTEE Encodeur", // le boîtier
  remoteName: "OBS CLOUD", // le contrôle OBS à distance (produit n°1)
  tagline: "Branche ta caméra. Diffuse de n'importe où. Sans te ruiner.",
  /** Positionnement : le boîtier le plus accessible du marché, pensé pour les streamers (pas pour la télévision). */
  pitch: "Le boîtier où tu branches ta caméra : il réunit jusqu'à trois connexions (Wi-Fi, Ethernet, 4G ou 5G) et diffuse ton direct vers YouTube, Twitch ou Kick.",
  /** soon : « bientôt disponible » ; preorder : « Précommander » ; available : « Acheter ». */
  availability: "preorder" as Availability, // TODO À CONFIRMER : précommande ou vente
  /** Prix en euros TTC (annoncé par SYXTEE NETWORKS). */
  price: 599.99,
  priceLabel: (p: number | null) => (p === null ? null : `${p.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`),
  discord: "https://discord.gg/CD68F8yZuZ",
  /** Mois offerts de l'abonnement le plus élevé à l'activation de l'Encodeur sur un compte (code à usage unique). */
  bonusMonths: 4,
  specs: {
    /** Connexions simultanées intégrées. Une clé 4G USB ajoute une connexion de plus, sans limite autre que les ports. */
    simultaneous: 3,
    connections: ["Wi-Fi", "Ethernet (pour un terminal satellite)", "4G ou 5G"],
    usbModem: "Chaque clé 4G USB ajoute une connexion supplémentaire",
    camera: "Câble USB-C de 2 m : n'importe quelle caméra de poche en 1080p60", // TODO À CONFIRMER : liste des caméras compatibles
    videoInput: "1080p60",
    latencyMs: 84, // TODO À CONFIRMER : latence moyenne de bout en bout
    protocols: ["SRT", "SRTLA", "RTMP"], // TODO À CONFIRMER
    ports: ["Entrée vidéo USB-C", "Ethernet", "Port USB pour clé 4G", "Wi-Fi"], // TODO À CONFIRMER
    engraving: "SYXTEE NETWORKS gravé sur le boîtier",
    power: "USB-C PD, 15 W", // TODO À CONFIRMER : alimentation
    consumption: "8 W en charge", // TODO À CONFIRMER
    firmware: "0.1.0", // TODO À CONFIRMER
  },
  platforms: ["YouTube", "Twitch", "Kick"], // seules marques tierces autorisées sur le site public
  /** Variantes du boîtier. Une seule : une carte produit. */
  variants: [{ id: "standard", name: "SYXTEE Encodeur", pitch: "Le boîtier, prêt à brancher.", price: 599.99 as number | null, featured: true }],
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
  /** Abonnement du service OBS CLOUD et de l'interface de l'Encodeur. Prix « bientôt disponible » tant que null. */
  plans: [
    { id: "free", name: "Gratuit", text: "Découvre le dashboard.", points: ["Compte et dashboard", "Documentation", "Support"], price: null as number | null },
    { id: "paid", name: "Payant", text: "Direct stable, santé du flux et contrôle OBS à distance.", points: ["Direct stable en 4G et 5G", "Mire de coupure automatique", "OBS CLOUD et interface de l'Encodeur"], price: null as number | null, featured: true },
    { id: "partner", name: "Partenaire", text: "Pour les créateurs et les régies accompagnés.", points: ["Accès illimité", "Espaces partagés", "Contact direct"], price: null as number | null },
  ],
} as const;

export const ctaLabel = (a: Availability) => (a === "available" ? "Acheter" : a === "preorder" ? "Précommander" : "Être prévenu du lancement");
export const fromPrice = () => {
  const p = product.variants.map((v) => v.price).filter((x): x is number => x !== null);
  return p.length ? `À partir de ${product.priceLabel(Math.min(...p))}` : "Prix bientôt disponible";
};
