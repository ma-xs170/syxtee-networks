export type FaqItem = { q: string; a: string };

// Les 5 premières questions s'affichent aussi sur l'accueil.
export const faq: FaqItem[] = [
  {
    q: "C'est quoi le SRTLA ?",
    a: "Le SRTLA permet d'envoyer ta vidéo sur plusieurs connexions en même temps (4G, 5G, Wi-Fi). Le relais rassemble les morceaux et reconstitue un flux stable. Si un réseau lâche, le live continue sur les autres.",
  },
  {
    q: "Quelles applications sont compatibles ?",
    a: "Moblin (iOS), IRL Pro (Android) et BELABOX. Côté diffusion, tu récupères le flux dans OBS Studio puis tu streames vers Twitch, Kick, YouTube ou toute plateforme compatible.",
  },
  {
    q: "J'ai besoin d'un PC ?",
    a: "Oui : OBS tourne sur ton PC (à la maison, par exemple). C'est lui qui récupère le flux du relais et l'envoie sur ta plateforme, avec tes scènes et overlays.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Trois formules : Basique 5,99 € par mois, Premium 14,99 € et Extra 34,99 €, avec 2 mois offerts à l'année. Sans engagement. Le détail est sur la page Offres.",
  },
  {
    q: "Comment contacter le support ?",
    a: "Uniquement sur Discord : ouvre un ticket dans le salon support et on te répond directement. Aucune demande n'est traitée par email.",
  },
  {
    q: "Mon téléphone va chauffer et se vider vite ?",
    a: "Encoder de la vidéo en continu tout en utilisant plusieurs réseaux, c'est ce qu'on peut demander de plus dur à un téléphone : il chauffe et la batterie descend vite. Branche une batterie externe USB-C compatible charge rapide (PD), retire la coque, évite le soleil direct sur l'écran et baisse la luminosité. Si le téléphone chauffe trop, passe en 720p ou en 30 images/s, et active le H.265 (HEVC), qui demande moins de bitrate pour la même qualité. Un petit ventilateur à clipser fait aussi une vraie différence en été.",
  },
  {
    q: "Quel forfait data il me faut ?",
    a: "Un forfait avec beaucoup de data en 4G/5G, idéalement 100 Go ou plus si tu lives souvent. Vérifie que ton forfait n'est pas bridé après un certain volume et qu'il couvre bien les pays où tu streames. Pour le bonding, le mieux est d'avoir deux opérateurs différents : quand l'un capte mal, l'autre prend souvent le relais. Sur iPhone, une seule ligne data est utilisée à la fois, donc la deuxième connexion passe par un autre téléphone en partage de connexion, ou par un modem en Wi-Fi.",
  },
  {
    q: "Je peux mettre 2 SIM dans mon iPhone pour doubler la 4G ?",
    a: "Non, l'iPhone n'utilise qu'une ligne de données à la fois. Ajoute un 2e appareil avec une eSIM Saily et Moblink.",
  },
  {
    q: "Combien de data je consomme par heure ?",
    a: "Ça dépend du bitrate que tu envoies. En gros : 3 Mb/s ≈ 1,4 Go par heure, 6 Mb/s ≈ 2,7 Go par heure, 8 Mb/s ≈ 3,6 Go par heure. Avec le bonding, ce total est réparti entre tes connexions, pas multiplié, mais prévois environ 10 % de plus pour les paquets renvoyés quand le réseau est instable. Pour de l'IRL, 4 à 6 Mb/s en 1080p H.265 est un bon compromis.",
  },
  {
    q: "OBS doit rester allumé pendant tout le live ?",
    a: "Oui. C'est ton PC qui récupère le flux sur le relais et qui l'envoie à Twitch, Kick ou YouTube. Il doit donc rester allumé, connecté à Internet et avec OBS ouvert tant que tu es en live. Une connexion fibre ou câble à la maison est idéale. Désactive la mise en veille du PC avant de partir.",
  },
  {
    q: "Ça marche sur Android ?",
    a: "Oui, avec IRL Pro, qui gère le SRTLA et le bonding sur Android. Tu configures l'adresse du relais comme sur Moblin. Côté relais et OBS, rien ne change : le flux arrive de la même façon, quel que soit ton téléphone.",
  },
];
