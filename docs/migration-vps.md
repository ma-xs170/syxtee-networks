# Migration du relais vers un nouveau VPS (ex. OVHcloud VPS-2)

Principe : on monte le nouveau serveur **à côté** de l'ancien, on teste, puis on bascule. L'ancien droplet reste allumé jusqu'à la fin.
Les relais, les clés (chiffrées) et les comptes sont dans Supabase : ils ne bougent pas. Le Core du nouveau serveur les relit tout seul.

## Ce qu'il faut savoir avant

- **`RELAY_KEYS_SECRET` est vital.** Les clés des relais sont chiffrées en base avec ce secret. Sans la même valeur sur le nouveau serveur, toutes les URLs deviennent illisibles. Copie-le depuis `/opt/syxtee/.env` de l'ancien serveur, ne le régénère pas.
- **`CORE_API_TOKEN`** doit être identique à celui de Vercel (sinon le dashboard ne parle plus au Core).
- **`SLS_API_KEY` change** : le nouveau `srtla-receiver` génère sa propre clé. `setup-env.sh` la détecte tout seul.
- **L'adresse des relais ne change plus** : `RELAY_PUBLIC_HOST=relais.syxtee-networks.fr`. À la bascule, repointer l'enregistrement DNS A `relais` vers la nouvelle IP (TTL bas, 300 s, la veille). Les streamers ne touchent à rien. Seul `CORE_DOMAIN` (API du Core, en `…sslip.io`) suit l'IP.
- Les relais seront coupés pendant la bascule finale (quelques minutes).

## 0. Avant de commander (sur l'ancien serveur)

- [ ] Noter l'IP actuelle : `curl -4 ifconfig.me`
- [ ] Sauvegarder `/opt/syxtee/.env` hors du VPS (gestionnaire de mots de passe) : en particulier `RELAY_KEYS_SECRET`, `CORE_API_TOKEN`, `SUPABASE_SECRET_KEY`, `SECURITY_ALLOW_IPS`
- [ ] Noter la version de `srtla-receiver` utilisée : `docker ps --format '{{.Names}}\t{{.Image}}'` et le dossier de son compose (`find / -maxdepth 4 -name 'docker-compose*.yml' 2>/dev/null`)
- [ ] Optionnel : copier `/opt/syxtee/data` (historique santé 24 h). Pas nécessaire : il se reconstitue.

## 1. Commande OVH

- [ ] VPS-2 (4 vCore, 8 Go). Image **Ubuntu 24.04 LTS**. Localisation : côte Est (Beauharnois ou Vint Hill si proposé). Sans engagement au début.
- [ ] Ajouter ta clé SSH à la commande (ou noter le mot de passe root reçu par e-mail)
- [ ] Noter la nouvelle IP : `<NOUVELLE_IP>`

## 2. Préparer le serveur

```bash
ssh root@<NOUVELLE_IP>
apt-get update && apt-get -y upgrade
apt-get install -y ca-certificates curl git ufw fail2ban
curl -fsSL https://get.docker.com | sh
```

- [ ] Pare-feu (Docker contourne ufw, voir l'étape suivante pour les ports internes) :

```bash
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp
ufw allow 5000/udp   # SRTLA (Moblin)
ufw allow 4000/udp   # SRT lecture (OBS)
ufw allow 4001/udp   # SRT publication (IRL Pro, encodeurs)
ufw allow 1935/tcp   # RTMP (DJI, GoPro, OBS)
ufw allow 8189/udp   # WebRTC (SYXTEE Cam, SYXTEE STUDIO en direct)
ufw allow 8189/tcp   # WebRTC, secours TCP
ufw --force enable
systemctl enable --now fail2ban
```

- [ ] Vérifier aussi le pare-feu du panneau OVH (Network, Firewall) : ne rien y bloquer.

## 3. Installer srtla-receiver

- [ ] Installer le même `srtla-receiver` que sur l'ancien serveur (dossier et compose noté à l'étape 0).
- [ ] Éditer son compose pour lier les ports `3000` et `8080` à la machine seulement :

```yaml
      - "127.0.0.1:3000:3000"
      - "127.0.0.1:8080:8080"
```

- [ ] `docker compose -f docker-compose.prod.yml up -d` puis vérifier : `cat .apikey` (clé de l'API du relais)
- [ ] Vérifier que rien d'autre n'écoute sur 1935 : `ss -ltnp | grep 1935` (vide)

## 4. Installer le Core, le Guard et MediaMTX

```bash
mkdir -p /opt/syxtee && cd /opt/syxtee
git clone --depth 1 --filter=blob:none --sparse https://github.com/ma-xs170/syxtee-networks.git repo
cd repo && git sparse-checkout set core && cd ..
ln -s repo/core core
cp core/deploy/docker-compose.yml core/deploy/Caddyfile .
mkdir -p data && chown -R 1000:1000 data
```

- [ ] Créer `/opt/syxtee/.env` : copier celui de l'ancien serveur, puis changer **seulement** :
  - `CORE_DOMAIN` : `<NOUVELLE_IP avec des tirets>.sslip.io` (ex. `203-0-113-7.sslip.io`)
  - `CAM_DOMAIN` : `cam.<NOUVELLE_IP avec des tirets>.sslip.io` (si utilisé)
  - `RELAY_PUBLIC_HOST` : **ne pas changer** (`relais.syxtee-networks.fr`) ; repointer le DNS A à la bascule
  - `SLS_API_KEY` : la valeur de `.apikey` du nouveau srtla-receiver
  - `SECURITY_ALLOW_IPS` : `<NOUVELLE_IP>`
  - **Garder** `RELAY_KEYS_SECRET`, `CORE_API_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RELAY_NAME`, `CORS_ORIGINS`
- [ ] `docker compose up -d --build` (premier build : plusieurs minutes)
- [ ] `docker compose logs --tail 100 core` : attendre « prêt sur :8787 » et « N relais : clés chiffrées » (ou équivalent)
- [ ] `curl https://<CORE_DOMAIN>/health` doit répondre `{"ok":true,"sls":true,"streams_live":0}`

## 4 bis. Régie (mire de coupure), si voulue

- [ ] `bash core/deploy/enable-regie.sh` (4 Go et 2 vCPU minimum : OK sur ce plan). Premier build de `Dockerfile.regie` : 10 minutes environ.

## 5. Tester sans rien casser

- [ ] Audit de sécurité : `cd /opt/syxtee && docker compose exec -T core node --input-type=module - < core/test/security-audit.mjs` : tout doit être ✅
- [ ] Depuis ton ordinateur : `curl https://<CORE_DOMAIN>/ping` répond 204
- [ ] Les relais ne sont pas encore joignables par les streamers (les URLs pointent encore sur l'ancien serveur). Test réel avec un relais de test : publier avec ffmpeg vers `<NOUVELLE_IP>` et lire avec OBS (voir l'URL SRT affichée dans le dashboard une fois bascule faite).

## 6. Bascule (fenêtre calme, prévenir les streamers)

- [ ] Prévenir sur le Discord : « le relais change d'adresse le <date> à <heure>, il faudra coller les nouvelles URLs dans Moblin / OBS / caméras ».
- [ ] Vercel (Production et Preview) : `CORE_URL=https://<NOUVEAU_CORE_DOMAIN>` (`CORE_API_TOKEN` inchangé), puis redéployer.
- [ ] Vérifier le dashboard : « Mes relais » affiche les URLs avec la nouvelle IP.
- [ ] Arrêter le Core de l'ancien serveur pour éviter deux Core sur la même base : `docker compose stop core guard` (sur l'ancien).
- [ ] Les streamers recollent leurs URLs. Vérifier un live complet : Moblin vers le relais, lecture dans OBS, santé du flux dans le dashboard.
- [ ] Caméras DJI et GoPro : recoller l'URL RTMP (la page Caméras externes la donne).

## 7. Après

- [ ] Garder l'ancien droplet **48 heures** au repos (il peut resservir en retour arrière : relancer son Core et remettre l'ancien `CORE_URL`).
- [ ] Sauvegarder le nouveau `.env` (gestionnaire de mots de passe).
- [ ] Supprimer l'ancien droplet et sa facturation une fois tout stable.
- [ ] Mettre à jour la mémoire du projet : nouvelle IP, nouveau domaine, hébergeur.

## Retour arrière

Remettre `CORE_URL` de l'ancien serveur sur Vercel, redéployer, relancer `docker compose start core guard` sur l'ancien droplet. Les URLs d'origine fonctionnent de nouveau.
