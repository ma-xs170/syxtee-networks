# SYXTEE Cam native sur iPhone : plan

Rédigé le 29/09/2026, après la suppression du stabilisateur JavaScript de SYXTEE Cam (`src/components/cam/stabilizer.ts`).

## 1. Pourquoi le stabilisateur JS a été retiré

Il lisait le gyroscope (`DeviceMotionEvent`), puis recadrait et redessinait chaque image dans un canvas avant de la renvoyer
en WebRTC. Résultat : image recadrée et moins nette, décalage entre le gyroscope et l'image (flottement), téléphone qui chauffe
(chaque image passe par le processeur, en plus de l'encodage H.264), et une autorisation « Mouvements » en plus sur iPhone.

## 2. Ce qu'un navigateur peut vraiment faire

| Question | Réponse | Preuve |
| --- | --- | --- |
| Existe-t-il une contrainte `getUserMedia` pour la stabilisation ? | **Non.** La liste des contraintes (`width`, `height`, `aspectRatio`, `frameRate`, `facingMode`, `resizeMode`, `deviceId`, `groupId`, plus l'audio) n'en contient aucune. | [MDN : MediaTrackSupportedConstraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSupportedConstraints) |
| Safari (WebKit) active-t-il la stabilisation d'iOS ? | **Non.** Le code de capture de WebKit (`AVVideoCaptureSource.mm`) ne règle jamais `preferredVideoStabilizationMode`. Or la valeur par défaut d'AVFoundation est `.off`. Une page web ne peut donc pas choisir le mode « cinématique ». | [WebKit : AVVideoCaptureSource.mm](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mediastream/cocoa/AVVideoCaptureSource.mm) (aucune occurrence de « stabiliz »), [Apple : preferredVideoStabilizationMode](https://developer.apple.com/documentation/avfoundation/avcaptureconnection/preferredvideostabilizationmode) |
| Et Chrome sur Android ? | Cela dépend du téléphone et de la version de Chrome, et la page ne peut ni le demander ni le vérifier. | Même absence de contrainte (MDN, ci-dessus) |

### VDO.Ninja

- **Version web** : même moteur que nous (`getUserMedia` + WebRTC). Sa documentation iOS liste les réglages caméra accessibles
  (zoom, mise au point, exposition, torche), sans stabilisation. [docs.vdo.ninja : iOS](https://docs.vdo.ninja/platform-specific-issues/ios)
- **App iOS native** : écrite en Flutter (`steveseguin/vdon_flutter`), elle capture via `flutter-webrtc`, qui s'appuie sur
  `RTCCameraVideoCapturer` de libwebrtc. Ce capteur iOS ne règle aucun mode de stabilisation (aucune occurrence dans
  [RTCCameraVideoCapturer.m](https://github.com/webrtc-sdk/webrtc/blob/master/sdk/objc/components/capturer/RTCCameraVideoCapturer.m)).
  Sur Android, en revanche, libwebrtc active la stabilisation optique ou numérique du téléphone quand elle existe
  ([Camera2Session.java](https://github.com/webrtc-sdk/webrtc/blob/master/sdk/android/src/java/org/webrtc/Camera2Session.java), `chooseStabilizationMode`).
- **Conclusion** : VDO.Ninja n'a pas de stabilisation sur iPhone, ni en web ni en app. Seule une app qui pilote AVFoundation
  elle-même l'obtient.

### Ce que SYXTEE Cam web fait maintenant

- La caméra est envoyée telle quelle, sans aucun traitement image par image.
- Contraintes : résolution de la formule en `ideal`, 16/9, 30 i/s, `resizeMode: "none"` (le capteur fournit directement le
  format, sans mise à l'échelle par le navigateur). Caméra arrière principale par défaut, ultra grand-angle (0,5x) ou
  téléobjectif si le navigateur les liste.
- Sur iPhone : conseil affiché une fois, puis toujours visible dans les réglages : « Pour une stabilisation maximale en IRL,
  utilise Moblin avec ton relais SYXTEE. »

## 3. App iOS native « SYXTEE Cam »

### Ce qu'il faut

- Capture AVFoundation avec `connection.preferredVideoStabilizationMode = .cinematicExtended` (iOS 13+), ou
  `.cinematicExtendedEnhanced` (iOS 18+) si l'appareil le propose (`activeFormat.isVideoStabilizationModeSupported`).
  Selon Apple, la stabilisation ajoute de la latence et de la mémoire : à mesurer en IRL, puis choisir entre `.cinematic` et
  `.cinematicExtended`. La page web ne peut rien de cela : la valeur par défaut d'AVFoundation est `.off`.
- Encodage matériel H.264/HEVC (VideoToolbox), audio AAC.
- Envoi en SRT vers un relais SYXTEE, idéalement en SRTLA (bonding 4G + Wi-Fi).
- Connexion avec le lien caméra actuel (`cam_…`) ou le compte SYXTEE, puis choix du relais.
- Le reste de SYXTEE Cam : GPS vers `/v1/cam/gps`, mode Scan, chat Twitch, REC local.

### Option A : fork de Moblin (recommandée)

Moblin ([eerimoq/moblin](https://github.com/eerimoq/moblin), licence **MIT**) a déjà tout le cœur :

- les modes de stabilisation d'AVFoundation, dont « Cinematic extended enhanced » (`Settings.swift`, `Model.swift`) ;
- SRT et SRTLA (bonding), RTMP ;
- les caméras DJI en Bluetooth (utile pour le Prompt F) ;
- l'import de réglages par lien `moblin://?<JSON>` (`MoblinSettingsUrl.swift`).

Plan :

1. Fork, renommage (bundle ID, nom, icône, couleurs SYXTEE). La licence MIT impose de garder la mention de copyright et le texte
   de la licence (écran « À propos » + fichier LICENSE).
2. Réduire l'interface : un seul flux vers un relais SYXTEE, stabilisation « cinématique étendue » par défaut sur la caméra arrière.
3. Ajouter la connexion SYXTEE (lien caméra ou compte), la liste des relais, et l'envoi GPS + le mode Scan (API du Core existante).
4. Suivre les mises à jour de Moblin (rebase régulier) : c'est le coût principal de cette option.

Avantages : des mois de travail évités, une base testée en IRL. Inconvénients : gros code Swift à maintenir, dépendance au rythme
de Moblin, et il faut se démarquer assez de Moblin pour la validation App Store (règle 4.3 « Spam » sur les apps trop proches).

### Option B : app Swift écrite de zéro

Plus légère et maîtrisée, mais il faut réécrire SRT/SRTLA (bibliothèque `libsrt` + implémentation SRTLA), l'encodage et la
reconnexion. Compter plusieurs mois. À réserver au cas où le fork devient trop lourd.

### Option C : Capacitor + plugin caméra natif

L'interface actuelle (React) resterait dans une WebView, mais la capture, la stabilisation, l'encodage et l'envoi SRT doivent
quand même être écrits en Swift dans un plugin. On y gagne peu par rapport à l'option A, avec en plus une couche de passerelle
JS/natif. Déconseillé.

### Coûts et délais

- Apple Developer Program : **99 $/an** (obligatoire pour TestFlight et l'App Store).
- Un Mac avec Xcode (déjà disponible), un iPhone de test.
- Fork Moblin allégé jusqu'à TestFlight : environ 3 à 6 semaines de travail, puis la revue App Store (quelques jours).

### Solution immédiate (sans app)

Ajouter dans « Mes relais » un bouton « Ouvrir dans Moblin » qui construit un lien `moblin://?{"streams":[{"name":"SYXTEE …",
"url":"srtla://…"}]}` : Moblin s'ouvre avec le relais déjà configuré, et la stabilisation d'iOS se règle dans Moblin.
À faire après le déploiement des clés chiffrées (le lien contient la clé de publication : ne l'afficher qu'au propriétaire,
masqué comme les URLs).
