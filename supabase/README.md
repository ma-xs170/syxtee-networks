# Comptes SYXTEE : configuration

L'authentification repose sur **Supabase Auth**. La connexion se fait par **email + mot de passe** (adresse vérifiée par un lien). Twitch sert seulement à lier sa chaîne (Profil). Les emails partent via **Resend** (SMTP).
Les clés OAuth et le SMTP se renseignent **dans Supabase**, pas dans les variables du site.

Deux projets Supabase : **production** et **test** (tests e2e). Refaire les étapes 1 à 4 sur chacun.

URL de retour OAuth de Supabase (appelée `CALLBACK` plus bas) :
`https://<ref-du-projet>.supabase.co/auth/v1/callback` (Project Settings → General → Reference ID).

---

## 1. Créer le projet Supabase

1. supabase.com → New project. Région : **Europe** (Paris `eu-west-3` ou Francfort `eu-central-1`).
2. `supabase link --project-ref <ref>` puis `supabase db push` (ou SQL Editor → coller `supabase/migrations/0001_comptes.sql` → Run).
3. **Project Settings → API Keys** : copier l'URL du projet, la clé **publishable** (`sb_publishable_…`) et la clé **secret** (`sb_secret_…`).

## 2. Réglages Auth en code : `supabase/config.toml`

URL du site, URL de retour autorisées (prod, previews Vercel, localhost), lien valable 10 minutes et liaison manuelle
sont déclarés dans `supabase/config.toml` et appliqués avec :

```
supabase link --project-ref <ref>
supabase config diff   # vérifier
supabase config push
```

Seuls les réglages déclarés dans le fichier sont envoyés. Le modèle d'email SYXTEE y est commenté : Supabase le refuse
tant que le SMTP par défaut est utilisé (offre gratuite). Le décommenter après l'étape 4 (Resend), puis `supabase config push`.

## 3. Authentication → Sign In / Providers

- **Email** : activé, avec « Confirm email » (confirmation, longueur minimale, liens 24 h et liaison manuelle : gérées par `config.toml`).
- **Twitch** : activé (Client ID + Client Secret, étape 6) : nécessaire pour « Lier mon Twitch ».
- **Discord**, **Google** : désactiver. Les comptes créés avec eux se connectent désormais avec leur email (voir « Comptes existants »).

### Comptes existants (passage au mot de passe)

Les comptes créés par lien magique, Twitch, Discord ou Google n'ont pas de mot de passe. Sur `/connexion`, le lien
« Définis ton mot de passe » passe par « Mot de passe oublié » avec la même adresse : ils retrouvent tout leur compte.
Au premier passage dans le dashboard, une modale leur demande prénom et nom (migration `0013_names.sql`).

## 4. Authentication → Emails

**Modèle d'email** : après le SMTP ci-dessous, décommenter les blocs `[auth.email.template.*]` de `config.toml` et lancer
`supabase config push` (ou coller `supabase/templates/magic-link.html` dans Templates → Magic Link et Confirm signup).

**SMTP Settings** → Enable custom SMTP (après l'étape 7) :

| Champ | Valeur |
|---|---|
| Sender email | `connexion@<ton-domaine>` |
| Sender name | `SYXTEE` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | ta clé API Resend (`re_…`) |

**Authentication → Rate Limits** : « Emails sent per hour » à **100** (le site limite déjà à 5 par heure et par adresse).

## 5. Variables d'environnement

`.env.local` (dev) et **Vercel → Settings → Environment Variables** (Production + Preview) : voir `.env.example`.
Tests : `.env.test.local` avec `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_SECRET_KEY` (projet **de test**).

---

## 6. Applications OAuth

### Twitch (connexion + API du statut live)

1. dev.twitch.tv/console → se connecter (activer la double authentification si demandé) → **Applications → Register Your Application**.
2. Name : `SYXTEE` · OAuth Redirect URLs : `CALLBACK` (ajouter aussi celle du projet de test) · Category : `Website Integration` · Client Type : **Confidential** → Create.
3. **Manage** → copier le **Client ID** → **New Secret** → copier le secret.
4. Coller dans Supabase (Twitch) ET dans `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` (Vercel + `.env.local`).

### Discord

1. discord.com/developers/applications → **New Application** → nom `SYXTEE` → Create.
2. General Information : icône (logo S) et description.
3. **OAuth2** → copier **Client ID** → **Reset Secret** → copier le secret.
4. OAuth2 → **Redirects** → Add Redirect : `CALLBACK` (+ celle du projet de test) → Save Changes.
5. Coller dans Supabase (Discord).

### Google

1. console.cloud.google.com → sélecteur de projet → **New project** `SYXTEE` → Create.
2. **Google Auth Platform** (APIs & Services → OAuth consent screen) → Get started :
   - App name `SYXTEE`, email d'assistance, Audience **External**, email de contact → Create.
   - **Branding** : logo, page d'accueil `https://<ton-domaine>`, `/confidentialite`, `/cgu`. Authorized domains : `<ton-domaine>` et `supabase.co`.
   - **Data Access** : scopes `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile` (pas de scope sensible, pas de vérification Google).
   - **Audience** → **Publish app** (sinon seuls les testeurs peuvent se connecter).
3. **Clients** → Create client → **Web application** → nom `SYXTEE web` :
   - Authorized JavaScript origins : `https://<ton-domaine>`, `http://localhost:3000`
   - Authorized redirect URIs : `CALLBACK` (+ celle du projet de test)
4. Copier Client ID + Client Secret → Supabase (Google).

## 7. Resend : vérifier le domaine

1. resend.com → créer le compte → **Domains → Add Domain** : `<ton-domaine>` (ou un sous-domaine d'envoi, ex. `mail.<ton-domaine>`), région **Ireland (eu-west-1)**.
2. Resend affiche les enregistrements DNS à créer chez ton registrar (OVH, Cloudflare, Gandi…) :
   - **TXT** `resend._domainkey` (DKIM)
   - **MX** `send` → `feedback-smtp.eu-west-1.amazonses.com` (priorité 10)
   - **TXT** `send` → `v=spf1 include:amazonses.com ~all` (SPF)
   - recommandé : **TXT** `_dmarc` → `v=DMARC1; p=none;`
   Copier les valeurs **exactes** affichées par Resend (elles font foi).
3. Attendre la propagation (quelques minutes à quelques heures) → **Verify DNS Records** → statut **Verified**.
4. **API Keys → Create API Key** : permission **Sending access**, domaine = celui vérifié → copier la clé (`re_…`, affichée une seule fois).
5. Renseigner le SMTP dans Supabase (étape 4) → envoyer un lien de test depuis /connexion.
