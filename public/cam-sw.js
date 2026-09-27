// Service worker de SYXTEE Cam (installation en app). Pas de cache hors ligne : une caméra sans réseau ne sert à rien.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
