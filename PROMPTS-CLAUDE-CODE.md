# SYXTEE NETWORKS — Mise en ligne + prompts Claude Code

## 0. Avant de commencer (une seule fois)

- Installe **Node.js LTS** : https://nodejs.org
- Installe **Git** : https://git-scm.com
- Installe **GitHub CLI** : https://cli.github.com
- Crée un compte **GitHub**, puis un compte **Vercel** en te connectant avec GitHub.
- Dézippe `syxtee-networks.zip`, ouvre un terminal dans le dossier, puis lance `claude`.

---

## 1. Vérifier le site en local

```
Tu es dans le projet du site vitrine SYXTEE NETWORKS (Next.js + Tailwind v4).
Lis README.md et AGENTS.md, puis :
1. lance npm install ;
2. lance npm run lint puis npm run build, et corrige les erreurs s'il y en a ;
3. lance npm run dev et donne-moi l'URL locale pour que je vérifie le site dans mon navigateur.
Ne change ni le design ni les textes.
```

## 2. Publier sur GitHub

```
Publie ce projet sur GitHub :
1. vérifie que gh est installé et connecté (sinon lance "gh auth login" et guide-moi pas à pas) ;
2. vérifie que .gitignore exclut node_modules, .next et .env* ;
3. git init si besoin, puis un premier commit "Site vitrine SYXTEE NETWORKS" ;
4. crée le repo public "syxtee-networks" avec : gh repo create syxtee-networks --public --source=. --push ;
5. donne-moi le lien du repo.
```

## 3. Déployer sur Vercel

Le plus simple, c'est de passer par l'interface :

1. Va sur **vercel.com**, clique sur **Add New… → Project**, puis **Import** sur `syxtee-networks`.
2. Vercel détecte Next.js tout seul : tu cliques sur **Deploy** sans rien changer.
3. Ensuite, chaque `git push` sur `main` remet le site en ligne automatiquement.

Ou via Claude Code :

```
Déploie ce projet sur Vercel avec la CLI :
1. npx vercel login (guide-moi) ;
2. npx vercel link pour créer le projet "syxtee-networks" ;
3. npx vercel --prod ;
4. donne-moi l'URL de production.
Ensuite, vérifie que le projet Vercel est bien connecté au repo GitHub, pour que chaque push déploie tout seul.
```

## 4. Mettre l'URL finale / un nom de domaine

```
Mon site est en ligne sur <COLLE L'URL VERCEL OU TON DOMAINE>.
Mets à jour site.url dans src/lib/site.ts avec cette URL (elle sert au SEO, au sitemap et à l'image de partage).
Build, commit "URL de production", push.
```

Pour un domaine perso (ex. syxtee.network) : dans Vercel, va dans **Settings → Domains → Add**, puis copie les DNS indiqués chez ton registrar.

---

## Prompts de modification (à utiliser au besoin)

### Compléter les mentions légales
```
Dans src/app/mentions-legales/page.tsx, remplace les [À COMPLÉTER] par :
- Responsable de la publication : <NOM>
- Statut / SIRET : <STATUT + SIRET>
- Adresse : <ADRESSE>
Vérifie aussi que l'adresse de Vercel Inc. est toujours à jour.
Build, commit, push.
```

### Ajouter un nouveau relais
```
Ajoute un relais dans src/lib/site.ts → relays :
ville "<VILLE>", région "<RÉGION>", status "<online ou soon>", protocoles SRTLA et SRT.
Vérifie le rendu de la grille sur mobile. Build, commit, push.
```

### Ouvrir les tarifs (quand tu seras prêt)
```
Remplace la section « Bientôt disponible » (src/components/sections/Offers.tsx) par une grille de 3 offres, dans le même style noir et blanc, bordures fines et mono :
- <NOM 1> — <PRIX>/mois — <features>
- <NOM 2> — <PRIX>/mois — <features> (mise en avant « Populaire »)
- Sur mesure — sur devis — <features>
Les boutons renvoient vers le Discord pour l'instant.
Mets aussi à jour la réponse « Combien ça coûte ? » dans la FAQ. Build, commit, push.
```

### Ajouter une page guide « Configurer Moblin »
```
Crée une page /guide/moblin dans le même style que le site : un tutoriel en étapes numérotées pour connecter Moblin (iOS) au relais SRTLA SYXTEE (adresse et port en placeholders <ADRESSE_RELAIS> et <PORT>), puis la source SRT dans OBS.
Ajoute un lien « Guides » dans le menu (src/lib/site.ts → nav) et dans le footer. Ajoute la page au sitemap.
Build, commit, push.
```

### Ajouter Vercel Analytics (gratuit)
```
Installe @vercel/analytics et ajoute <Analytics /> dans src/app/layout.tsx.
Build, commit, push. Ensuite, dis-moi où activer Analytics dans le dashboard Vercel.
```

### Ajouter les réseaux sociaux dans le footer
```
Ajoute dans src/lib/site.ts un objet socials (TikTok : <URL>, Instagram : <URL>, Twitch : <URL>, Kick : <URL>, Discord).
Affiche-les en icônes SVG monochromes dans le footer. Build, commit, push.
```

### Plus tard : paiements Stripe
```
Je veux passer SYXTEE NETWORKS de site vitrine à plateforme avec abonnements Stripe.
Avant de coder, propose-moi une architecture : auth, base de données, Stripe Checkout + Customer Portal, webhooks, génération automatique d'une clé de stream par abonné sur mon relais (DigitalOcean, OpenIRL srtla-receiver).
Donne-moi les étapes et les coûts estimés. N'écris pas de code tant que je n'ai pas validé.
```

---

**Règle d'or :** termine chaque demande par « Build, commit, push ». Vercel remet le site à jour tout seul après chaque push.
