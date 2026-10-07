// Service worker de SYXTEE (installation sur l'écran d'accueil). Aucun cache : le direct et le contrôle d'OBS n'ont de sens
// qu'en ligne, et une page périmée serait pire qu'une page qui charge. Il rend le site installable et ouvre l'app plein écran.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
