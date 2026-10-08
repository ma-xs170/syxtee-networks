// Source unique du produit SYXTEE RELAIS (le boîtier) et de son service. Toute la landing lit ce fichier.
// Les valeurs marquées TODO À CONFIRMER sont plausibles, pas définitives : ne les présente jamais comme officielles.

export type Availability = "soon" | "preorder" | "available";

export const product = {
  brand: "SYXTEE NETWORKS",
  name: "SYXTEE RELAIS", // le boîtier
  remoteName: "OBS CLOUD", // le contrôle OBS à distance (abonnement) // TODO À CONFIRMER : le nom a changé plusieurs fois
  tagline: "Le boîtier qui relaie ton stream IRL et pilote ton OBS, où que tu sois.",
  /** soon : « bientôt disponible » ; preorder : « Précommander » ; available : « Acheter ». */
  availability: "soon" as Availability, // TODO À CONFIRMER
  /** Prix en euros TTC. null : « bientôt disponible ». */
  price: null as number | null, // TODO À CONFIRMER
  priceLabel: (p: number | null) => (p === null ? null : `${p.toLocaleString("fr-FR")} €`),
  discord: "https://discord.gg/CD68F8yZuZ",
  /** Chiffres géants du bento. */
  specs: {
    bondedConnections: 8, // TODO À CONFIRMER : connexions bondées au maximum
    latencyMs: 84, // TODO À CONFIRMER : latence moyenne de bout en bout
    protocols: ["SRT", "SRTLA", "RTMP"], // TODO À CONFIRMER
    ports: ["Ethernet", "USB", "Antennes 4G/5G", "Wi-Fi"], // TODO À CONFIRMER
    modems: 2, // TODO À CONFIRMER : emplacements de modem 4G/5G
    power: "USB-C PD, 15 W", // TODO À CONFIRMER : alimentation
    consumption: "8 W en charge", // TODO À CONFIRMER
    firmware: "0.1.0", // TODO À CONFIRMER
  },
  compat: ["Starlink Mini", "Moblin", "OBS", "Twitch", "YouTube"], // TODO À CONFIRMER
  relayServer: { city: "Beauharnois", code: "BHS1", region: "Québec" },
  /** Variantes du boîtier. Une seule : une carte produit. Plusieurs : 2 ou 3 cartes, celle du milieu mise en avant. */
  variants: [{ id: "standard", name: "SYXTEE RELAIS", pitch: "Le boîtier, prêt à brancher.", price: null as number | null, featured: true }], // TODO À CONFIRMER
  /** Abonnement du service OBS CLOUD et du relais. Prix « bientôt disponible » tant que null. */
  plans: [
    { id: "free", name: "Gratuit", text: "Découvre le dashboard.", points: ["Compte et dashboard", "Documentation", "Support Discord"], price: null as number | null },
    { id: "paid", name: "Payant", text: "Relais, santé du flux et contrôle OBS à distance.", points: ["Relais SRTLA et RTMP", "Santé du flux et mire", "OBS CLOUD"], price: null as number | null, featured: true },
    { id: "partner", name: "Partenaire", text: "Pour les créateurs et les régies accompagnés.", points: ["Accès illimité", "Espaces partagés", "Contact direct"], price: null as number | null },
  ],
} as const;

export const ctaLabel = (a: Availability) => (a === "available" ? "Acheter" : a === "preorder" ? "Précommander" : "Être prévenu du lancement");
export const fromPrice = () => {
  const p = product.variants.map((v) => v.price).filter((x): x is number => x !== null);
  return p.length ? `À partir de ${Math.min(...p).toLocaleString("fr-FR")} €` : "Prix bientôt disponible";
};
