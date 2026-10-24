# Héberger le site sur le VPS OVH (bhs1), sans Vercel

Le site Next.js tourne dans un conteneur `web` à côté du Core, derrière le Caddy déjà en place (HTTPS automatique). Huit hôtes pour un seul conteneur :

| Hôte | Rôle |
|---|---|
| `www.syxtee-networks.fr` | site public (l'apex `syxtee-networks.fr` redirige ici) |
| `app.syxtee-networks.fr` | espace client, Direct |
| `admin.syxtee-networks.fr` | administration |
| `remote.syxtee-networks.fr` | contrôle à distance d'un OBS |
| `docs.syxtee-networks.fr` | documentation |
| `status.syxtee-networks.fr` | état du service |
| `stats.syxtee-networks.fr` | statistiques (centre de contrôle) |
| `auth.syxtee-networks.fr` | connexion, inscription, mot de passe |

Le site partage les 6 vCPU avec les relais. Le conteneur est plafonné à 3 Go. Le build (`next build`) charge le CPU plusieurs minutes : le lancer hors d'un live.

## 1. DNS (OVH, zone `syxtee-networks.fr`)

- [ ] Veille de la bascule : TTL à 300 s sur les enregistrements `@`, `www`, `app`, `auth`.
- [ ] Pour tester avant : `staging` en A vers `15.235.25.77`.

## 2. Code sur le VPS

```bash
cd /opt/syxtee/repo && sudo git sparse-checkout disable && sudo git pull
sudo cp core/deploy/docker-compose.yml core/deploy/Caddyfile /opt/syxtee/
```

## 3. Variables

`/opt/syxtee/.env` (lu par Caddy et au build) :

```
SITE_DOMAINS=staging.syxtee-networks.fr
NEXT_PUBLIC_SUPABASE_URL=…
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
NEXT_PUBLIC_COOKIE_DOMAIN=.syxtee-networks.fr
CORS_ORIGINS=https://www.syxtee-networks.fr,https://app.syxtee-networks.fr,https://auth.syxtee-networks.fr,https://admin.syxtee-networks.fr,https://remote.syxtee-networks.fr,https://stats.syxtee-networks.fr,https://staging.syxtee-networks.fr,http://localhost:3000
```

`/opt/syxtee/.env.web` (`chmod 600`, variables serveur, mêmes valeurs qu'aujourd'hui, surtout `CHAT_TOKEN_KEY`) :
`SUPABASE_SECRET_KEY`, `CORE_URL=https://15-235-25-77.sslip.io`, `CORE_API_TOKEN`, `TWITCH_CLIENT_ID/SECRET`, `KICK_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `YOUTUBE_API_KEY`, `CHAT_TOKEN_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `SEND_EMAIL_HOOK_SECRET`, `ADMIN_EMAILS`, `OWNER_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `FEATURE_*`, `SIGNUP_RESTRICTED`, `CRON_SECRET` (chaîne au hasard).

## 4. Lancement

```bash
cd /opt/syxtee
sudo docker compose up -d --build web caddy
sudo docker compose logs --tail 50 web
curl -I https://staging.syxtee-networks.fr
```

## 5. Tâche planifiée (remplace le cron Vercel)

`sudo crontab -e` :

```
0 6 * * * curl -fsS -H "Authorization: Bearer $(grep ^CRON_SECRET= /opt/syxtee/.env.web | cut -d= -f2-)" http://127.0.0.1:3100/api/cron/formules >/dev/null
```

## 6. Tester sur staging

Accueil, connexion, dashboard, un relais, avatars Twitch, `/api/cron/formules` (401 sans jeton, 200 avec).
Sur staging les redirections entre `www`, `app` et `auth` ne s'appliquent pas (hôte inconnu) : tout reste sur une seule adresse.

## 7. Bascule

- [ ] `.env` : `SITE_DOMAINS=syxtee-networks.fr, www.syxtee-networks.fr, app.syxtee-networks.fr, auth.syxtee-networks.fr, admin.syxtee-networks.fr, remote.syxtee-networks.fr, docs.syxtee-networks.fr, status.syxtee-networks.fr`, puis `sudo docker compose up -d caddy`.
- [ ] DNS OVH : `@`, `www`, `app`, `auth` en **A vers `15.235.25.77`** (supprimer les CNAME Vercel).
- [ ] Supabase, Authentication, URL Configuration : Site URL `https://www.syxtee-networks.fr`, Redirect URLs `app.`, `auth.`, `admin.`, `remote.`, `docs.`, `status.`, `www.` (`/**`).
- [ ] Stripe : webhook `https://www.syxtee-networks.fr/api/stripe/webhook`.
- [ ] OAuth Twitch / Kick / Google (liaison du multichat) : URI de retour `https://app.syxtee-networks.fr/api/chat/callback/twitch` (idem `kick`, `youtube`).
- [ ] Bot Discord : `SITE_URL=https://www.syxtee-networks.fr`.
- [ ] Vérifier une connexion, un paiement test Stripe et le multichat.
- [ ] Supprimer le projet Vercel (et `vercel.json`) quand tout est validé.

## Retour arrière (avant la suppression de Vercel)

Remettre les anciens enregistrements DNS vers Vercel (TTL 300 s : quelques minutes).

## Mises à jour

```bash
cd /opt/syxtee/repo && sudo git pull && cd .. && sudo docker compose up -d --build web
```

Pas de déploiement automatique au `git push` : c'est une commande à lancer sur le VPS.

## Ce qui change par rapport à Vercel

- Pas de géolocalisation par IP dans les en-têtes : la ville et le pays disparaissent de l'e-mail « nouvel appareil ».
- Pas de CDN mondial : les images et pages statiques sortent du VPS (Canada). Caddy compresse en zstd et gzip.
