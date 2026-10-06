# Héberger le site sur le VPS OVH (bhs1)

Le site Next.js tourne dans un conteneur `web` à côté du Core, derrière le Caddy déjà en place (HTTPS automatique). Vercel reste en secours : rien n'y change tant que le DNS n'est pas basculé.

Limite : le site partage les 6 vCPU avec les relais. Le conteneur est plafonné à 3 Go de mémoire. Le premier build (`next build`) prend plusieurs minutes et charge le CPU : le lancer hors d'un live.

## 1. DNS (chez le registrar du domaine)

- [ ] Baisser le TTL du domaine à 300 s la veille.
- [ ] Créer `staging.<domaine>` : enregistrement A vers `15.235.25.77`, pour tester avant la bascule.

## 2. Récupérer le code complet sur le VPS

```bash
cd /opt/syxtee/repo
git sparse-checkout disable
git pull
cp core/deploy/docker-compose.yml core/deploy/Caddyfile /opt/syxtee/
```

## 3. Variables

- [ ] Dans `/opt/syxtee/.env` (lu par Caddy et au build), ajouter :
  - `SITE_DOMAIN=staging.<domaine>` (puis `<domaine>` à la bascule)
  - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (valeurs de Vercel, publiques)
  - `CORS_ORIGINS` : ajouter l'URL du site (Core)
- [ ] Créer `/opt/syxtee/.env.web` (`chmod 600`) avec les variables serveur de Vercel (voir `.env.example`) :
  `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SECRET_KEY`, `TWITCH_*`, `CORE_URL=https://15-235-25-77.sslip.io`, `CORE_API_TOKEN`, `RESEND_API_KEY`, `EMAIL_FROM`, `SEND_EMAIL_HOOK_SECRET`, `ADMIN_EMAILS`, `STRIPE_*`, `CHAT_TOKEN_KEY`, `KICK_*`, `GOOGLE_*`, `YOUTUBE_API_KEY`, `FEATURE_*`, et `CRON_SECRET` (chaîne au hasard).
  Garder les mêmes valeurs que Vercel (surtout `CHAT_TOKEN_KEY`), sinon les jetons chiffrés ne se lisent plus.

## 4. Lancement

80 et 443 sont déjà ouverts. Le site écoute seulement sur 127.0.0.1:3000.

```bash
cd /opt/syxtee
docker compose up -d --build web caddy
docker compose logs --tail 50 web
curl -I https://staging.<domaine>
```

## 5. Tâches planifiées (remplacent les crons Vercel)

`crontab -e` :

```
30 7 * * * curl -fsS -H "Authorization: Bearer $(grep ^CRON_SECRET= /opt/syxtee/.env.web | cut -d= -f2-)" http://127.0.0.1:3000/api/cron/antennes >/dev/null
0 6 * * *  curl -fsS -H "Authorization: Bearer $(grep ^CRON_SECRET= /opt/syxtee/.env.web | cut -d= -f2-)" http://127.0.0.1:3000/api/cron/formules >/dev/null
```

## 6. Tester sur `staging.<domaine>`

- [ ] Accueil, connexion, dashboard, un relais, images (avatars Twitch), `/api/cron/antennes` en `curl` (401 sans jeton, 200 avec).
- [ ] Supabase, Authentication, URL Configuration : ajouter `https://staging.<domaine>/**` aux Redirect URLs.

## 7. Bascule

- [ ] `.env` : `SITE_DOMAIN=<domaine>`, puis `docker compose up -d caddy`. Enregistrement A du domaine vers `15.235.25.77` (retirer l'ancien CNAME Vercel).
- [ ] Mettre à jour avec le domaine final : Supabase (Site URL, Redirect URLs), Stripe (webhook `/api/stripe/webhook`), redirections OAuth Twitch / Kick / Google (`/api/chat/callback/*`), liens Discord, `CORS_ORIGINS` du Core (puis `docker compose up -d core`).
- [ ] Vérifier une connexion, un paiement test Stripe et le multichat.

## Retour arrière

Remettre l'ancien enregistrement DNS vers Vercel (TTL 300 s : quelques minutes). Vercel garde son déploiement et ses variables.

## Mises à jour

```bash
cd /opt/syxtee/repo && git pull && cd .. && docker compose up -d --build web
```

Pas de déploiement automatique au `git push` pour OVH. Vercel continue d'en faire tant qu'il est lié au dépôt.
