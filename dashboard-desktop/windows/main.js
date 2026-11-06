// SYXTEE Dashboard pour Windows : le dashboard du site dans sa propre fenêtre (même comportement que l'app Mac).
const { app, BrowserWindow, Menu, shell, session, dialog } = require("electron");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const BASE = new URL(process.env.SYXTEE_DASHBOARD_URL || "https://www.syxtee-networks.fr/dashboard");
const ORIGIN = BASE.origin;
const HOSTS = ["syxtee-networks.fr", "localhost"];
const SCHEME = "syxteedashboard";

let win = null;
let linkState = null;

const isOurs = (host) => HOSTS.some((h) => host === h || host.endsWith("." + h));

// ── Une seule instance : le retour du navigateur (syxteedashboard://…) arrive dans l'instance déjà ouverte.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  if (process.defaultApp && process.argv.length >= 2) app.setAsDefaultProtocolClient(SCHEME, process.execPath, [path.resolve(process.argv[1])]);
  else app.setAsDefaultProtocolClient(SCHEME);

  app.on("second-instance", (_e, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    const url = argv.find((a) => a.startsWith(SCHEME + "://"));
    if (url) handleDeepLink(url);
  });
  app.on("open-url", (e, url) => { e.preventDefault(); handleDeepLink(url); });
  app.whenReady().then(start);
  app.on("window-all-closed", () => app.quit());
}

// ── Position et taille de la fenêtre mémorisées.
const stateFile = () => path.join(app.getPath("userData"), "window.json");
function loadBounds() {
  try { return JSON.parse(fs.readFileSync(stateFile(), "utf8")); } catch { return {}; }
}

function start() {
  const b = loadBounds();
  win = new BrowserWindow({
    width: b.width || 1360, height: b.height || 860, x: b.x, y: b.y,
    minWidth: 900, minHeight: 600, backgroundColor: "#171717", title: "SYXTEE Dashboard",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  if (b.maximized) win.maximize();
  win.on("close", () => {
    try { fs.writeFileSync(stateFile(), JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {}
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "Navigation", submenu: [
      { label: "Accueil", accelerator: "CmdOrCtrl+D", click: () => win.loadURL(BASE.href) },
      { label: "Précédent", accelerator: "Alt+Left", click: () => win.webContents.navigationHistory.goBack() },
      { label: "Suivant", accelerator: "Alt+Right", click: () => win.webContents.navigationHistory.goForward() },
      { label: "Recharger", accelerator: "CmdOrCtrl+R", click: () => win.webContents.reload() },
      { type: "separator" },
      { label: "Se connecter via le navigateur", click: startLink },
      { label: "Ouvrir le site", click: () => shell.openExternal(ORIGIN) },
      { type: "separator" },
      { role: "quit", label: "Quitter" },
    ] },
    { label: "Édition", submenu: [{ role: "undo", label: "Annuler" }, { role: "redo", label: "Rétablir" }, { type: "separator" }, { role: "cut", label: "Couper" }, { role: "copy", label: "Copier" }, { role: "paste", label: "Coller" }, { role: "selectAll", label: "Tout sélectionner" }] },
    { label: "Affichage", submenu: [{ role: "togglefullscreen", label: "Plein écran" }, { role: "resetZoom", label: "Zoom normal" }, { role: "zoomIn", label: "Zoom +" }, { role: "zoomOut", label: "Zoom -" }] },
  ]));

  const wc = win.webContents;
  wc.setUserAgent(wc.getUserAgent() + " SyxteeDashboardApp/" + app.getVersion());
  // Caméra et micro : seulement pour le site SYXTEE.
  session.defaultSession.setPermissionRequestHandler((w, perm, cb, details) => {
    let ok = false;
    try { ok = isOurs(new URL(details.requestingUrl).hostname) && ["media", "fullscreen", "clipboard-sanitized-write", "notifications"].includes(perm); } catch {}
    cb(ok);
  });

  // Liens externes → navigateur ; page de connexion du site → connexion par le navigateur.
  wc.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  wc.on("will-navigate", (e, url) => guard(e, url));
  wc.on("will-redirect", (e, url) => guard(e, url));
  wc.on("did-fail-load", (_e, code, _d, url, isMain) => {
    if (isMain && code !== -3) showPage("Connexion impossible", "Vérifie ta connexion internet.", "Réessayer", BASE.href);
  });

  const initial = process.argv.find((a) => a.startsWith(SCHEME + "://"));
  win.loadURL(BASE.href);
  if (initial) wc.once("did-finish-load", () => handleDeepLink(initial));
}

function guard(e, url) {
  let u;
  try { u = new URL(url); } catch { return; }
  if (u.protocol === SCHEME + ":") { e.preventDefault(); handleDeepLink(url); return; }
  if (!["http:", "https:"].includes(u.protocol)) { e.preventDefault(); return; }
  if (!isOurs(u.hostname)) { e.preventDefault(); shell.openExternal(url); return; }
  if (u.pathname === "/connexion" && (!linkState || u.search.includes("erreur"))) { e.preventDefault(); startLink(); }
}

function showPage(title, text, button, href) {
  const html = `<body style="background:#171717;color:#eee;font:15px Segoe UI,sans-serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center"><div><h2>${title}</h2><p style="color:#999">${text}</p><a href="${href}" style="display:inline-block;background:#e5322d;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${button}</a></div></body>`;
  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
}

// ── Connexion par le navigateur : /liaison-app → « Autoriser » → syxteedashboard://auth?token_hash=…&state=…
function startLink() {
  linkState = crypto.randomBytes(24).toString("base64url");
  shell.openExternal(`${ORIGIN}/liaison-app?state=${linkState}`);
  showPage("Autorise l'application dans ton navigateur", "Clique sur « Autoriser » dans la page qui vient de s'ouvrir.", "Rouvrir le navigateur", `${SCHEME}://retry`);
}

function handleDeepLink(raw) {
  let u;
  try { u = new URL(raw); } catch { return; }
  if (u.protocol !== SCHEME + ":") return;
  if (u.hostname === "retry") return startLink();
  const hash = u.searchParams.get("token_hash");
  if (u.hostname !== "auth" || !linkState || u.searchParams.get("state") !== linkState || !hash) return;
  linkState = null;
  const c = new URL(ORIGIN + "/auth/confirm");
  c.searchParams.set("token_hash", hash); c.searchParams.set("type", "magiclink"); c.searchParams.set("next", "/dashboard");
  win.loadURL(c.href);
  win.show(); win.focus();
}
