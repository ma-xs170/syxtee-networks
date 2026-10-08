// Documentation du site : uniquement les fonctions de SYXTEE NETWORKS (aucun service tiers, sauf OBS Studio).
// Chaque guide : du texte (paragraphes, étapes, listes) et, si une capture existe, une image.

export type DocBlock =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string }
  | { type: "img"; src: string; alt: string; w: number; h: number };

export type DocGuide = { slug: string; title: string; summary: string; group: string; keywords?: string; blocks: DocBlock[] };

export const docGroups = ["Démarrer", "Direct", "OBS", "Équipe", "Compte"] as const;

export const docs: DocGuide[] = [
  {
    slug: "premiers-pas",
    group: "Démarrer",
    title: "Premiers pas",
    summary: "De la création du compte au premier direct dans OBS.",
    keywords: "commencer debut compte url obs source media",
    blocks: [
      { type: "p", text: "SYXTEE NETWORKS te donne un relais : ton flux vidéo arrive sur nos serveurs, puis ton OBS le récupère. Le tableau de bord sert à créer ce relais, à le surveiller et à piloter ton OBS à distance." },
      { type: "h", text: "En cinq étapes" },
      {
        type: "steps",
        items: [
          "Demande ton accès depuis la page d'accueil, puis connecte-toi à ton compte.",
          "Ouvre Direct, puis Flux, et crée un relais (voir « Créer un relais »).",
          "Copie l'adresse du relais affichée dans la page.",
          "Dans OBS Studio, ajoute une source Média, décoche « Fichier local » et colle l'adresse.",
          "Lance ton direct depuis ton appareil de capture : la vue d'ensemble passe sur « En direct ».",
        ],
      },
      { type: "note", text: "Sans formule, le compte reste en lecture : crée-toi un relais dès que ton accès inclut une formule Basique ou supérieure." },
      { type: "img", src: "/images/screens/relais-mobile.png", alt: "Page des relais sur mobile", w: 780, h: 1688 },
    ],
  },
  {
    slug: "nos-serveurs",
    group: "Démarrer",
    title: "Nos serveurs",
    summary: "Des serveurs dans le monde, avec nos services déjà en place.",
    keywords: "serveurs monde localisation latence relais",
    blocks: [
      { type: "p", text: "SYXTEE NETWORKS a des serveurs partout sur la planète et y met ses services en place. Tu choisis le serveur le plus proche de ton lieu de tournage, on s'occupe du reste." },
      { type: "p", text: "La liste des serveurs et leur état (opérationnel, en maintenance, bientôt disponible) s'affiche quand tu crées un relais." },
    ],
  },
  {
    slug: "creer-un-relais",
    group: "Démarrer",
    title: "Créer un relais",
    summary: "L'assistant en quatre étapes : protocole, appareil, serveur, récapitulatif.",
    keywords: "srtla rtmp serveur protocole nouveau",
    blocks: [
      { type: "p", text: "Dans Flux, le bouton de création ouvre un assistant en quatre étapes. Un compteur indique combien de relais tu utilises sur le maximum de ta formule." },
      { type: "h", text: "Les étapes" },
      {
        type: "steps",
        items: [
          "Protocole : SRTLA (recommandé) répartit le flux sur plusieurs connexions pour un direct plus stable ; RTMP n'utilise qu'une seule connexion.",
          "Appareil : donne un nom à ce relais (1 à 40 caractères), par exemple le nom de ta caméra.",
          "Serveur : la latence est mesurée depuis chez toi, le plus proche est indiqué. Un serveur peut être marqué « En maintenance » ou « Bientôt disponible ».",
          "Récapitulatif : vérifie puis clique sur « Créer le relais ».",
        ],
      },
      { type: "p", text: "Quand la limite de ta formule est atteinte, le bouton devient « Limite atteinte » avec un lien pour demander plus de relais." },
    ],
  },
  {
    slug: "mes-relais",
    group: "Direct",
    title: "Gérer mes relais",
    summary: "Adresses, clé, bascule automatique, changement de serveur, archivage.",
    keywords: "cle regenerer archiver supprimer bascule serveur tentatives connexion",
    blocks: [
      { type: "p", text: "La liste de Flux se filtre par état (en live, actifs, inactifs), par protocole, par serveur ou par recherche. Chaque relais affiche ses adresses de connexion et un menu d'actions." },
      { type: "h", text: "Actions disponibles" },
      {
        type: "list",
        items: [
          "Renommer : change le nom affiché, sans toucher à l'adresse.",
          "Déclenchement de la bascule : choisis quand l'écran de secours s'affiche. « Coupure seulement », « Coupure et débit très bas » (sous 300 kbit/s) ou « Sensible » (2 s ou 800 kbit/s).",
          "Changer de serveur : déplace le relais vers un autre serveur en gardant la même clé.",
          "Régénérer la clé : les anciennes adresses cessent de fonctionner immédiatement. À utiliser si une adresse a fuité.",
          "Archiver / Réactiver : un relais archivé ne compte plus dans ta limite.",
          "Supprimer : définitif. L'historique des directs est conservé.",
        ],
      },
      { type: "h", text: "Tentatives de connexion" },
      { type: "p", text: "Un encart liste les tentatives de connexion refusées, avec l'adresse IP et le pays. Si quelque chose te semble anormal, régénère la clé." },
    ],
  },
  {
    slug: "sante-du-direct",
    group: "Direct",
    title: "Vue d'ensemble et santé du direct",
    summary: "Le statut du direct, l'activité sur 7 jours et ta formule d'un coup d'œil.",
    keywords: "statut live en direct hors ligne accueil dashboard",
    blocks: [
      { type: "p", text: "La Vue d'ensemble est la première page du tableau de bord. Un bandeau en haut indique l'état de ton direct : « En direct », « Reconnexion », « Hors ligne » ou « Relais injoignable », avec la date du dernier direct." },
      {
        type: "list",
        items: [
          "Attention requise : un bloc « Rien à signaler » ou la liste de ce qui demande ton attention.",
          "Activité sur 7 jours : le temps de direct par jour, comparé à la période précédente.",
          "Formule : son nom, les relais actifs sur le maximum, et les flux simultanés.",
          "Mes OBS : les ordinateurs reliés, que tu peux renommer.",
        ],
      },
      { type: "img", src: "/images/screens/sante-bureau.png", alt: "Vue d'ensemble du tableau de bord", w: 1650, h: 1032 },
    ],
  },
  {
    slug: "connexion-basse",
    group: "Direct",
    title: "Connexion basse",
    summary: "Une version en texte seul pour suivre ton relais quand le réseau est faible.",
    keywords: "data faible 4g economie debit latence",
    blocks: [
      { type: "p", text: "Connexion basse affiche ton relais en texte seul, sans graphiques : débit, latence, RTT, tampon, nombre de liaisons et pertes sur une minute. Idéal pour consulter l'état de ton direct avec très peu de données." },
      {
        type: "list",
        items: [
          "Choisis l'intervalle de mise à jour : 5, 15 ou 30 secondes.",
          "« Pause » arrête les mises à jour, « Rafraîchir » force une lecture.",
          "La mise à jour s'arrête d'elle-même quand l'onglet est caché.",
          "Un compteur estime les octets consommés par la page.",
        ],
      },
      { type: "p", text: "L'interrupteur se retrouve dans Paramètres, onglet Compte. Il est mémorisé sur ce navigateur uniquement." },
    ],
  },
  {
    slug: "statistiques",
    group: "Direct",
    title: "Statistiques et historique des lives",
    summary: "Temps de direct, débit, coupures, et le détail de chaque direct.",
    keywords: "stats historique lives debit coupures courbe",
    blocks: [
      { type: "p", text: "Ces deux pages demandent une formule Premium ou supérieure." },
      { type: "h", text: "Statistiques" },
      { type: "p", text: "Choisis 7 ou 30 jours. Tu vois le temps de direct, le nombre de directs, la durée moyenne, le débit moyen et la crête, le plus long direct, les coupures et les directs de moins d'une minute, avec la comparaison à la période précédente et un graphique par jour." },
      { type: "h", text: "Historique des lives" },
      { type: "p", text: "Les 100 derniers directs, avec le débit moyen et la crête, une courbe de débit et la durée. Ouvre un direct pour voir sa courbe complète, la durée, les coupures et le relais utilisé. Un direct de moins d'une minute n'a pas de courbe." },
    ],
  },
  {
    slug: "plugin-obs",
    group: "OBS",
    title: "Le plugin OBS",
    summary: "Installer le plugin SYXTEE dans OBS Studio.",
    keywords: "installer macos windows linux telecharger connecter",
    blocks: [
      { type: "p", text: "Le plugin relie ton OBS Studio à ton compte SYXTEE, sans port à ouvrir ni mot de passe. Il est nécessaire pour le contrôle à distance et les sauvegardes de scènes. OBS 30 ou plus récent est requis." },
      { type: "h", text: "Installation" },
      {
        type: "steps",
        items: [
          "Ouvre Plugin OBS dans le tableau de bord. Ton système est détecté et mis en avant.",
          "Télécharge l'installeur et lance-le.",
          "Ouvre OBS Studio, puis le menu SYXTEE et « Connecter ».",
          "Autorise la connexion dans la page qui s'ouvre. Un bandeau « Plugin détecté » apparaît dans le tableau de bord.",
        ],
      },
      {
        type: "list",
        items: [
          "macOS : un installeur universel, Apple Silicon et Intel.",
          "Windows : Windows 10 et 11, en bêta tant que le téléchargement n'est pas publié.",
          "Linux : pas de plugin pour le moment.",
        ],
      },
      { type: "note", text: "Sur macOS, si le système bloque l'installeur : clic droit puis Ouvrir, ou Réglages Système, Confidentialité et sécurité, « Ouvrir quand même »." },
    ],
  },
  {
    slug: "controle-a-distance",
    group: "OBS",
    title: "Contrôle à distance",
    summary: "Piloter ton OBS depuis un onglet ou ton téléphone.",
    keywords: "scenes sources audio mixeur demarrer direct enregistrement studio",
    blocks: [
      { type: "p", text: "Dans Direct, Contrôle à distance liste tes OBS reliés : « En ligne » ou « Hors ligne », le nom du poste, la version du plugin et un avertissement si une mise à jour est disponible. « Piloter OBS » ouvre la console de l'OBS choisi (actif seulement s'il est en ligne)." },
      { type: "h", text: "Ce que tu peux faire" },
      {
        type: "list",
        items: [
          "Changer de scène : la liste suit OBS dans les deux sens.",
          "Afficher ou masquer une source.",
          "Mixeur audio : régler le volume, couper le son, écouter.",
          "Démarrer et arrêter le direct et l'enregistrement, avec confirmation.",
          "Surveiller le débit, et voir l'image et le son du programme (son coupé par défaut).",
          "Prévisualiser la scène suivante en mode Studio.",
          "Changer de profil et de collection de scènes.",
        ],
      },
      { type: "img", src: "/images/remote/controle-bureau.png", alt: "Console de contrôle à distance sur ordinateur", w: 2160, h: 1350 },
      { type: "img", src: "/images/remote/controle-mobile.png", alt: "Console de contrôle à distance sur mobile", w: 780, h: 1688 },
    ],
  },
  {
    slug: "multistream",
    group: "OBS",
    title: "Multistream",
    summary: "Diffuser le même direct sur plusieurs plateformes, depuis le plugin.",
    keywords: "youtube twitch kick instagram tiktok facebook plateformes cle rtmp sortie",
    blocks: [
      { type: "p", text: "Le multistream envoie ton direct vers plusieurs plateformes en même temps : YouTube, Twitch, Kick, Instagram, TikTok, Facebook, X, Trovo, ou tout autre service qui accepte une adresse RTMP. Il est intégré au plugin SYXTEE et se pilote depuis le panneau Multistream du Contrôle à distance." },
      { type: "h", text: "Ajouter une plateforme" },
      {
        type: "steps",
        items: [
          "Ouvre le Contrôle à distance sur l'OBS voulu, puis le panneau Multistream.",
          "Clique sur « Ajouter » et choisis le logo de la plateforme. Un texte t'indique où trouver ta clé.",
          "Vérifie le nom. L'adresse du serveur est déjà remplie pour YouTube, Twitch, Facebook et Trovo. Pour Kick, Instagram, TikTok, X et « Autre service », colle aussi l'adresse donnée par la plateforme.",
          "Colle ta clé de stream, puis « Enregistrer ». « Voir » affiche la clé pour la vérifier.",
        ],
      },
      { type: "h", text: "Pendant le direct" },
      {
        type: "list",
        items: [
          "Chaque plateforme a son propre bouton : active-la ou coupe-la sans arrêter les autres.",
          "L'état de chaque sortie est affiché : « En direct », « Arrêté » ou « Connexion… », avec le message d'erreur si elle échoue.",
          "La plateforme réglée dans OBS apparaît déjà en haut, sous « Direct d'OBS » : inutile de l'ajouter.",
          "Lancer une autre sortie démarre aussi le direct d'OBS. Il s'arrête avec la dernière sortie.",
          "Tu peux modifier ou supprimer une sortie à tout moment.",
        ],
      },
      { type: "note", text: "Les clés de stream restent sur ton ordinateur, dans OBS. Elles ne sont jamais renvoyées vers le site." },
    ],
  },
  {
    slug: "sauvegardes-de-scenes",
    group: "OBS",
    title: "Sauvegardes de scènes",
    summary: "Sauvegarder tes collections de scènes OBS et les restaurer sur un autre poste.",
    keywords: "backup collection importer restaurer espace stockage",
    blocks: [
      { type: "p", text: "Sauvegarde une collection de scènes OBS avec ses médias, puis importe-la sur n'importe lequel de tes OBS. Les scripts Lua et Python ne sont pas sauvegardés." },
      { type: "h", text: "Sauvegarder" },
      { type: "p", text: "La sauvegarde se lance depuis OBS : menu SYXTEE, onglet Collections, « Sauvegarder »." },
      { type: "h", text: "Dans le tableau de bord" },
      {
        type: "list",
        items: [
          "Une barre indique l'espace utilisé sur ton quota. Un fichier identique n'est compté qu'une fois.",
          "Les collections sont regroupées, avec leurs versions (v1, v2…), la date, la taille, le nombre de médias et le poste d'origine.",
          "Choisis un « Poste cible » en ligne, puis « Importer » : la collection est ajoutée à cet OBS sans toucher à celle qui est ouverte.",
          "« Supprimer » demande une confirmation.",
        ],
      },
    ],
  },
  {
    slug: "multichat",
    group: "OBS",
    title: "Multichat",
    summary: "Lire et écrire dans le chat de tes plateformes depuis une seule page.",
    keywords: "twitch kick youtube chat messages",
    blocks: [
      { type: "p", text: "Multichat réunit le chat de tes chaînes. Twitch et Kick s'affichent dans un fil commun, en lecture, sans compte à relier. YouTube s'affiche dans un onglet à part." },
      {
        type: "list",
        items: [
          "Clique sur un logo pour afficher ou masquer une plateforme.",
          "Les chaînes sont reprises de ton profil : renseigne-les dans Profil & réseaux.",
          "Pour écrire dans le chat, relie ton compte avec la roue, puis choisis les plateformes visées.",
          "YouTube : le direct est recherché toutes les 45 secondes, la pastille s'active quand il est en cours.",
        ],
      },
    ],
  },
  {
    slug: "membres-et-invites",
    group: "Équipe",
    title: "Membres et invités",
    summary: "Donner accès à ton tableau de bord, avec des droits précis.",
    keywords: "inviter lien modérateur permissions role",
    blocks: [
      { type: "p", text: "Dans Membres, le bouton « Inviter » propose deux types d'accès. Les invités ne voient jamais tes sauvegardes ni tes réglages." },
      { type: "h", text: "Invité (lien)" },
      {
        type: "list",
        items: [
          "Donne un nom (40 caractères max), par exemple « Modérateur ».",
          "Choisis le niveau : Voir, Scènes et son, ou Tout piloter.",
          "Choisis la durée : 24 h, 7 jours, 30 jours ou jusqu'au retrait.",
          "Choisis « Tous les OBS » ou un OBS précis. L'e-mail est facultatif.",
          "Copie le lien. « Terminer » ou « Révoquer » coupe l'accès tout de suite.",
        ],
      },
      { type: "h", text: "Membre (compte)" },
      { type: "p", text: "Une invitation par e-mail, valable 7 jours, avec le rôle Membre ou Administrateur. Elle n'existe que dans un espace partagé." },
      { type: "p", text: "Le nombre d'invités dépend de ta formule. Le bouton est désactivé quand la limite est atteinte. L'onglet Permissions détaille les droits de chaque niveau." },
      { type: "img", src: "/images/screens/membres-bureau.png", alt: "Page Membres sur ordinateur", w: 1650, h: 1032 },
    ],
  },
  {
    slug: "espaces-partages",
    group: "Équipe",
    title: "Espaces partagés",
    summary: "Plusieurs OBS et une équipe dans un même espace.",
    keywords: "equipe regie roles proprietaire administrateur",
    blocks: [
      { type: "p", text: "Un espace partagé réunit plusieurs OBS et plusieurs personnes. Les relais, les OBS et les sauvegardes appartiennent à l'espace, pas à une personne." },
      { type: "h", text: "Les rôles" },
      {
        type: "list",
        items: [
          "Membre : voit et pilote les OBS, voit les flux et les statistiques.",
          "Administrateur : en plus, crée, modifie et supprime des flux, et gère les membres.",
          "Propriétaire : en plus, change les rôles, retire un administrateur, renomme et supprime l'espace.",
        ],
      },
      { type: "p", text: "Tu gères l'espace actif dans Paramètres, onglet Équipe : renommer, couleur, membres, invitations en attente, quitter ou supprimer l'espace. Les espaces sont inclus dans Premium (1) et Extra (jusqu'à 5)." },
    ],
  },
  {
    slug: "formules",
    group: "Compte",
    title: "Formules et limites",
    summary: "Ce que chaque formule permet.",
    keywords: "abonnement basique premium extra gratuit prix limites",
    blocks: [
      { type: "p", text: "Une fonction non incluse dans ta formule apparaît grisée avec un cadenas. Un clic explique comment y accéder." },
      {
        type: "list",
        items: [
          "Gratuit : le compte et le tableau de bord, sans relais.",
          "Basique : 1 relais, 1 direct à la fois, clés de stream, santé du flux et écran de secours.",
          "Premium : 10 relais, 3 directs en même temps, 3 invités, 1 espace partagé, statistiques, historique et toutes les fonctions.",
          "Extra : relais illimités, 10 directs en même temps, 5 invités, 5 espaces partagés.",
        ],
      },
      { type: "p", text: "L'abonnement annuel offre deux mois. Les prix sont indiqués sans TVA. La page Tarifs donne le détail et le tableau de comparaison." },
    ],
  },
  {
    slug: "profil-et-parametres",
    group: "Compte",
    title: "Profil et paramètres",
    summary: "Identité, sécurité, mode stream, appareils reliés.",
    keywords: "mot de passe email mode stream supprimer compte appareils",
    blocks: [
      { type: "p", text: "Profil & réseaux règle ce que les spectateurs voient : avatar et chaînes. Les Paramètres regroupent le reste, en onglets." },
      {
        type: "list",
        items: [
          "Compte : prénom et nom, e-mail (confirmation sur les deux adresses), mot de passe, déconnexion.",
          "Mode stream : floute les clés, les adresses et ton e-mail pour filmer ton écran sans risque.",
          "Appareils : les ordinateurs reliés, avec révocation immédiate.",
          "Usage : tes compteurs par rapport aux limites de ta formule.",
          "Intégrations : l'état de tes chaînes reliées.",
          "Suppression : « Supprimer mon compte » est définitif.",
        ],
      },
    ],
  },
  {
    slug: "support",
    group: "Compte",
    title: "Support",
    summary: "Obtenir de l'aide : communauté ou demande directe.",
    keywords: "aide ticket discord id support",
    blocks: [
      { type: "p", text: "La page Support propose deux canaux." },
      {
        type: "list",
        items: [
          "Communauté : notre Discord, recommandé. Ton ID de support est affiché dans la page : donne-le dans ton ticket, on retrouve ton compte sans ton e-mail.",
          "Demande directe : « Nouvelle demande » avec photos possibles. La réponse arrive dans le fil, et la cloche te prévient.",
        ],
      },
      { type: "p", text: "« Mes demandes » classe tes tickets en cours, résolus ou tous, avec la pastille « Nouveau » quand l'équipe a répondu. Tu peux supprimer un ticket depuis son détail." },
    ],
  },
  {
    slug: "application",
    group: "Compte",
    title: "Installer l'application",
    summary: "Ajouter SYXTEE à l'écran d'accueil de ton téléphone.",
    keywords: "pwa ecran accueil raccourci mobile",
    blocks: [
      { type: "p", text: "SYXTEE s'installe comme une application depuis ton navigateur, sans magasin d'applications. Elle s'ouvre en plein écran et garde l'écran allumé pendant le contrôle à distance." },
      {
        type: "steps",
        items: [
          "Ouvre le tableau de bord sur ton téléphone.",
          "Utilise la carte d'installation de la Vue d'ensemble, ou le menu de ton navigateur « Ajouter à l'écran d'accueil ».",
          "Un appui long sur l'icône donne des raccourcis : Contrôle à distance et Mes flux.",
        ],
      },
    ],
  },
];

export const docBySlug = (slug: string) => docs.find((d) => d.slug === slug);
