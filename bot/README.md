# SYXTEE Bot (Discord)

Bot du serveur Discord, hébergé sur le VPS dans le même `docker-compose.yml` que le Core.

| Fonction | Détail |
| --- | --- |
| `/services` | Embed d'état des services (site, Core, relais, RTMP, Cam, base) avec latence, **réactualisé toutes les 20 s** (~14 min) + bouton Actualiser |
| `/live` | Directs en cours (débit, liens, depuis quand) |
| `/serveur` | CPU, mémoire, réseau, disponibilité du VPS |
| `/ping`, `/liens`, `/aide` | Utilitaires |
| `/annonce` | Publie une nouveauté dans le salon (gérants du serveur) |
| Nouveautés auto | Chaque `git push` sur `main` arrive dans le salon (webhook GitHub) |
| Alertes auto | Panne puis retour d'un service, dans le salon (vu 2 minutes de suite pour éviter les faux positifs) |
| Panel `/admin/discord` | Depuis le site : annonce, statut du bot (auto « Regarde le stream de … » ou texte fixe), alertes, état des services. Routes `/discord/api/*`, jeton = `CORE_API_TOKEN`. Réglages gardés dans `./data/bot` |
| `POST /discord/announce` | Annonce depuis un script : `{title, body, url?, tag?}` + `Authorization: Bearer <BOT_ANNOUNCE_TOKEN>` |

## 1. Créer le bot (portail développeurs Discord)

1. https://discord.com/developers/applications > **New Application** > nom « SYXTEE », logo = `public/logo.png`.
2. **Bot** > **Reset Token** : copie le jeton (`DISCORD_TOKEN`). Aucun intent privilégié à activer.
3. **General Information** : copie l'**Application ID** (`DISCORD_CLIENT_ID`).
4. **OAuth2 > URL Generator** : scopes `bot` + `applications.commands` ; permissions : *View Channels*, *Send Messages*, *Embed Links*, *Attach Files*. Ouvre l'URL générée et ajoute le bot au serveur.
5. Mode développeur Discord > clic droit sur le serveur > **Copier l'identifiant** (`DISCORD_GUILD_ID`, les commandes apparaissent alors tout de suite).

Le salon des nouveautés est `1553431479302758571` (`DISCORD_CHANNEL_ID`, déjà par défaut). Le bot doit y avoir le droit d'écrire.

## 2. Variables à ajouter dans `/opt/syxtee/.env`

```
DISCORD_TOKEN=...
DISCORD_CLIENT_ID=...
DISCORD_GUILD_ID=...
SITE_URL=https://syxtee-networks.vercel.app
GITHUB_WEBHOOK_SECRET=<openssl rand -hex 24>
BOT_ANNOUNCE_TOKEN=<openssl rand -hex 24>
```

`CORE_API_TOKEN` et `SUPABASE_URL` sont déjà dans ce fichier (le bot s'en sert pour `/serveur`, `/live` et la sonde de la base).

## 3. Déployer

```bash
cd /opt/syxtee && git pull
# le compose attend le dossier bot/ à côté de core/
cp core/deploy/docker-compose.yml docker-compose.yml && cp core/deploy/Caddyfile Caddyfile   # si ce sont des copies chez toi
docker compose up -d --build bot caddy
docker compose logs -f bot        # « Connecté : SYXTEE#... » puis « 7 commandes enregistrées »
```

## 4. Webhook GitHub (nouveautés automatiques)

Dépôt GitHub > **Settings > Webhooks > Add webhook** :
- Payload URL : `https://<CORE_DOMAIN>/discord/github` (le domaine sslip.io du Core)
- Content type : `application/json`
- Secret : la valeur de `GITHUB_WEBHOOK_SECRET`
- Événement : **Just the push event**

## Développement

```bash
cd bot && npm install && npm run typecheck
DISCORD_TOKEN=... DISCORD_CLIENT_ID=... npm run dev
```

Le bandeau `assets/banner.png` se régénère avec `node assets/gen-banner.mjs`.
