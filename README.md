# SYXTEE NETWORKS — site vitrine

Site vitrine du relais IRL SRTLA low-cost **SYXTEE NETWORKS**.
Stack : Next.js (App Router) + Tailwind CSS v4, 100 % statique, déployé sur Vercel.
Support : **Discord uniquement** → https://discord.gg/CD68F8yZuZ

## Lancer en local

```bash
npm install
npm run dev
# http://localhost:3000
```

## Où modifier quoi

| Quoi | Fichier |
|---|---|
| Lien Discord, URL du site, relais, apps compatibles, menu | `src/lib/site.ts` |
| Hero (titre, accroche) | `src/components/sections/Hero.tsx` |
| Services 01–04 | `src/components/sections/Services.tsx` |
| Étapes « Fonctionnement » | `src/components/sections/HowItWorks.tsx` |
| Comparatif low-cost | `src/components/sections/LowCost.tsx` |
| Liste des serveurs | `src/lib/site.ts` → `relays` |
| Offres / tarifs | `src/components/sections/Offers.tsx` |
| FAQ | `src/components/sections/Faq.tsx` |
| Mentions légales | `src/app/mentions-legales/page.tsx` |
| Couleurs | `src/app/globals.css` |
| Logo / favicon / image de partage | `public/logo.png`, `src/app/icon.png`, `src/app/opengraph-image.png` |

## Ajouter un relais

Dans `src/lib/site.ts` :

```ts
{ city: "Miami", region: "USA · Floride", status: "soon", protocols: ["SRTLA", "SRT"] },
```

`status: "online"` affiche le point rouge « En ligne ».
