# SYXTEE Dashboard (app iOS)

Le dashboard du site en application SwiftUI native. Mêmes comptes (Supabase) et mêmes données que le site : l'app appelle
`/api/dashboard/overview`, `/api/app/me`, `/api/app/relays` et `/api/app/lives` avec le jeton de session en `Authorization: Bearer`.

## Voir l'app sur le Mac, en version iPhone

Depuis VS Code : `Terminal > Exécuter la tâche… > Dashboard iOS : compiler et lancer sur le Mac (version iPhone)`.
Ou en ligne de commande : `dashboard-ios/scripts/run-mac.sh`.

L'app s'ouvre dans une fenêtre aux dimensions d'un iPhone (cible « Mac conçu pour iPhone »). Première ouverture : macOS peut
demander de confirmer dans Réglages Système > Confidentialité et sécurité (« Ouvrir quand même »).

Dans Xcode : ouvre `SyxteeDashboard.xcodeproj`, choisis **My Mac (Designed for iPhone)** puis Cmd+R.

## Écrans
Accueil (indicateurs, graphique, alertes, derniers directs), Serveurs (adresses d'envoi, copie), Directs (détail et courbe de débit), Compte.
