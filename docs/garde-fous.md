# Garde-fous de production

Ce qui protège le site, point par point (les 20 contrôles), où c'est dans le code, et ce qu'il reste à régler **chez les fournisseurs** (impossible depuis le code).

## Dans le code

| # | Contrôle | Où |
|---|----------|----|
| 01 | Limite de requêtes par visiteur | `src/lib/guard.ts` (`limitOr429`, `throttle`) + `rate_limit_hit` (Postgres). Formulaires : `allow()`. Routes `/api/app/*` : 120/min par compte (`appUser`). `/api/youtube/*` 12–40/min, `/api/kick` 20/min, `/api/dashboard/overview` 60/min, `/api/log-error` 10/min par IP. |
| 02 | Plafond d'appels API | `budget()` dans `guard.ts` : YouTube chat 1 500 lectures/jour (5 unités chacune sur 10 000), YouTube live 3 000/jour, Kick 2 000/jour, e-mails Resend 2 000/jour et 8/heure par destinataire (`src/lib/email/send.ts`). Au plafond : 503 + `Retry-After`, le navigateur réessaie plus tard. |
| 03 | Plafond de dépenses chez les fournisseurs | **À régler à la main**, voir plus bas. |
| 04 | Message quand ça plante | `ErrorView` + `error.tsx` à la racine, dans `(site)`, `(dashboard)/dashboard`, `(admin)/admin`, et `global-error.tsx`. Le menu reste affiché. |
| 05 | Chargement au lieu d'un écran blanc | `loading.tsx` : `(site)`, `(auth)`, dashboard (+ relais), admin, compte. |
| 06 | Cas « rien à afficher » | `EmptyState` et textes « Aucun… » sur les listes ; courbes à moins de 2 points = zone vide, jamais de `NaN`. |
| 07 | Requêtes qui échouent | `src/components/dashboard/apiFetch.ts` : délai 10 s, 1 nouvel essai sur GET (réseau, 502/503/504, 429 avec `Retry-After`). Les envois (POST/DELETE) ne sont jamais rejoués. |
| 08 | API qui ne répondent pas | `AbortSignal.timeout` sur tous les appels sortants : Core 8 s, Twitch 6 s, Kick 6 s, YouTube 8 s, OAuth/chat 8 s, Resend 10 s, Stripe 15 s (+2 essais), Supabase 8 à 30 s (`src/lib/supabase/fetch.ts`). |
| 09 | Double clic sur « envoyer » | `Button type="submit"` se grise tout seul (`useFormStatus`). `SubmitLock` (dans `layout.tsx`) bloque en plus tout second envoi d'un même formulaire pendant 2 s. |
| 10 | Double paiement | Clés d'idempotence Stripe (30 min) sur l'abonnement et la boutique ; contrôle d'un abonnement déjà actif chez Stripe avant d'ouvrir un Checkout ; webhook : l'événement est **réservé avant** traitement (clé primaire), codes Encodeur jamais créés deux fois pour une commande. |
| 11 | Seulement les données affichées | Colonnes explicites (`PROFILE_COLUMNS`, `AFFILIATE_COLUMNS`) au lieu de `select("*")` sur les chemins fréquents. |
| 12 | Index | Migration `0054_garde_fous.sql` (clients Stripe, comptes, paiements, commandes…). |
| 13 | Listes en pages | `Pager` : demandes d'accès, devis, support, relais, codes Encodeur (en plus des comptes et du journal, déjà paginés). |
| 14 | Compression | `compress: true` (gzip sur le VPS, brotli sur Vercel), images AVIF/WebP. |
| 15 | Poids des fichiers | Avatar 2 Mo, photos de support 4 Mo × 5 (type vérifié sur le contenu), limites aussi côté bucket Supabase, corps JSON des routes `/api/app/*` 32 Ko (`readJson`), `/api/log-error` 4 Ko. |
| 16 | Cache | `revalidate` sur l'accueil (5 min), statut (30 s), pages affiliées (60 s) ; images optimisées 1 jour ; `/images`, `/visuals`, `/devices`, `/icons`… 1 jour + 7 jours en revalidation douce (`next.config.ts`). |
| 17 | Alerte si le site tombe | `/api/health` + `.github/workflows/uptime.yml` (toutes les 5 min, depuis GitHub : voit aussi une panne du VPS). Le bot Discord alerte déjà sur les services. |
| 18 | Trace de chaque erreur | `src/instrumentation.ts` (serveur, actions, routes) et `/api/log-error` (navigateur) écrivent dans `error_logs` ; lecture dans **Admin → Sécurité → Erreurs**. Secrets et e-mails masqués, 30 jours gardés. |
| 19 | Test de charge | `scripts/load-test.mjs` |
| 20 | Sauvegarde qui se restaure | `scripts/verify-backup.sh` + `.github/workflows/backup-check.yml` (chaque dimanche) |

## À activer une fois

1. **Appliquer la migration** `supabase/migrations/0054_garde_fous.sql` (Supabase → SQL Editor, ou `supabase db push`). Sans elle : le site marche, mais `/admin/erreurs` affiche « table introuvable » et les index manquent.
2. **Secrets GitHub** (dépôt → Settings → Secrets and variables → Actions) :
   - `SUPABASE_DB_URL` : chaîne de connexion « Session pooler » de Supabase (Project Settings → Database). Utilisée seulement en lecture par le test de restauration.
   - `DISCORD_ALERT_WEBHOOK` (facultatif) : URL de webhook d'un salon Discord pour être prévenu quand le site tombe.
3. Vérifier que les notifications d'échec de GitHub Actions arrivent bien par e-mail (GitHub → Settings → Notifications → Actions).

## 03 · Plafonner les dépenses chez les fournisseurs

À faire dans chaque tableau de bord (rien de tout cela ne peut se faire depuis le dépôt) :

- **Vercel** : Settings → Billing → *Spend Management* : fixer un montant mensuel, cocher « mettre le projet en pause » et les alertes e-mail à 50/75/100 %.
- **Supabase** : Organization → Billing : laisser *Spend Cap* **activé** (il bloque les dépassements au lieu de les facturer) ; sinon fixer des alertes d'usage.
- **Google Cloud (YouTube)** : le quota de 10 000 unités/jour est déjà un plafond dur ; ajouter une alerte à 80 % (IAM et administration → Quotas) et un budget Billing à 0 € si la facturation est liée.
- **Resend** : le plan fixe le nombre d'e-mails ; le code plafonne à 2 000/jour. Activer l'alerte d'usage.
- **Stripe** : pas de coût d'usage ; activer les alertes Radar et l'e-mail de litige.
- **OVH (VPS)** : prix fixe ; vérifier que la facturation à l'usage (bande passante, snapshots) est désactivée.
- **Twitch / Discord / Kick** : gratuits.

## 17 · Surveillance

- `GET /api/health` répond **200** si le site, la base et le Core répondent, **503** sinon (corps : `{ ok, down: [...], services }`).
- En plus (recommandé, gratuit) : un moniteur UptimeRobot / BetterStack sur `https://www.syxtee-networks.fr/api/health`, intervalle 1 à 5 min, alerte SMS ou push. Le workflow GitHub n'est qu'un second filet.
- Journal public des pannes : `src/lib/incidents.ts` (page `/statut`).

## 19 · Test de charge

```bash
node scripts/load-test.mjs --url http://localhost:3000 --visitors 50 --seconds 30
```

- Vise **ton** site (local, aperçu Vercel, ou production en heure creuse). Production : commencer à 10 visiteurs, monter par paliers.
- Sort en code 1 si plus de 1 % d'erreurs ou p95 > 3 000 ms (`--max-p95`).
- Les réponses 429 comptent comme « limitées », pas comme erreurs : si elles apparaissent sur les pages publiques, la limite est trop basse.

## 20 · Restauration de la sauvegarde

```bash
SOURCE_URL="postgresql://postgres.<ref>:<mot-de-passe>@aws-0-eu-west-3.pooler.supabase.com:5432/postgres" scripts/verify-backup.sh
```

Il faut `pg_dump`/`psql` 17 et Docker (ou une base jetable via `SCRATCH_URL`). Le script copie le schéma `public`, le restaure dans un Postgres jetable, puis compare le nombre de lignes de chaque table. Il ne fait **aucune écriture** dans la base source.

Ce que le test ne couvre pas : `auth.users` (comptes et mots de passe) et les fichiers du Storage (avatars, photos de support). Ils sont dans les sauvegardes Supabase : vérifier dans Supabase → Database → Backups que les sauvegardes quotidiennes existent (plan Pro et au-delà ; sur le plan gratuit il n'y en a pas, faire un `pg_dump` régulier).

Procédure de restauration réelle (en cas de perte) :
1. Supabase → Database → Backups → *Restore* sur le point voulu (ou nouveau projet, puis `psql` du dump).
2. Rejouer les migrations manquantes après la date de la sauvegarde (`supabase/migrations`).
3. Vérifier `/api/health`, une connexion, un abonnement actif, puis `/admin/erreurs`.
