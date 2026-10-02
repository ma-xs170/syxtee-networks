import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, shell, Tray } from "electron";
import { Agent, VERSION, type Status } from "../src/agent.ts";
import { cleanBackup } from "../src/backup.ts";
import { defaults, load, save, type LinkConfig } from "../src/config.ts";
import { claimCode } from "../src/pair.ts";

// SYXTEE Link (application) : fenêtre + icône dans la barre de menu. Même agent que la ligne de commande :
// il pilote OBS en local (obs-websocket) et se connecte au Core. La vidéo ne passe jamais par le serveur.

let cfg: LinkConfig = defaults();
let agent: Agent | null = null;
let status: Status = { core: "off", obs: "off", obsVersion: "", backup: "idle", lastError: "" };
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let quitting = false;
const logs: string[] = [];

const log = (m: string) => {
  logs.push(`${new Date().toLocaleTimeString("fr-FR")}  ${m}`);
  if (logs.length > 80) logs.shift();
  push();
};

function view() {
  return {
    version: VERSION,
    paired: cfg.token !== "",
    core: cfg.core,
    obs: { host: cfg.obs.host, port: cfg.obs.port, hasPassword: cfg.obs.password !== "" },
    backup: cfg.backup,
    status,
    autostart: app.getLoginItemSettings().openAtLogin,
    logs,
  };
}
const push = () => win?.webContents.send("state", view());

function startAgent() {
  agent?.stop();
  agent = null;
  status = { core: "off", obs: "off", obsVersion: "", backup: "idle", lastError: "" };
  if (!cfg.token) return push();
  agent = new Agent(cfg, log);
  agent.onStatus = (s) => {
    status = s;
    push();
    refreshTray();
  };
  agent.start();
  push();
}

function refreshTray() {
  if (!tray) return;
  const on = status.core === "on" && status.obs === "on";
  tray.setToolTip(`SYXTEE Link : ${on ? "connecté à OBS" : cfg.token ? "en attente" : "non appairé"}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: on ? "Connecté à OBS" : cfg.token ? "En attente d'OBS ou du serveur" : "Non appairé", enabled: false },
      { type: "separator" },
      { label: "Ouvrir SYXTEE Link", click: showWindow },
      { label: "Ouvrir SYXTEE Studio", click: () => void shell.openExternal("https://syxtee-networks.vercel.app/studio") },
      { type: "separator" },
      { label: "Quitter", click: () => ((quitting = true), app.quit()) },
    ]),
  );
}

function showWindow() {
  if (win) {
    win.show();
    win.focus();
    return;
  }
  win = new BrowserWindow({
    width: 480,
    height: 720,
    minWidth: 420,
    minHeight: 560,
    backgroundColor: "#000000",
    title: "SYXTEE Link",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: { preload: join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.setMenuBarVisibility(false);
  void win.loadFile(join(__dirname, "index.html"));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  // Fermer la fenêtre garde l'agent actif dans la barre de menu.
  win.on("close", (e) => {
    if (!quitting) {
      e.preventDefault();
      win?.hide();
    }
  });
  win.on("closed", () => (win = null));
  win.webContents.on("did-finish-load", push);
  // Test : SYXTEE_LINK_SHOT=/chemin.png enregistre une capture de la fenêtre puis quitte.
  const shot = process.env.SYXTEE_LINK_SHOT;
  if (shot)
    win.webContents.on("did-finish-load", () =>
      setTimeout(async () => {
        writeFileSync(shot, (await win!.webContents.capturePage()).toPNG());
        quitting = true;
        app.quit();
      }, 1200),
    );
}

const bool = (v: unknown) => v === true;

app.on("second-instance", showWindow);
if (!app.requestSingleInstanceLock()) app.quit();

void app.whenReady().then(() => {
  cfg = load();
  const icon = nativeImage.createFromPath(join(__dirname, "icon.png")).resize({ width: 18, height: 18 });
  if (process.platform === "darwin") icon.setTemplateImage(true);
  tray = new Tray(icon);
  tray.on("click", showWindow);
  refreshTray();

  ipcMain.handle("state", () => view());
  ipcMain.handle("pair", async (_e, code: unknown) => {
    const r = await claimCode(cfg.core, String(code ?? ""));
    if ("error" in r) return { error: r.error };
    cfg.token = r.token;
    save(cfg);
    startAgent();
    return { ok: true };
  });
  ipcMain.handle("unpair", () => {
    cfg.token = "";
    save(cfg);
    startAgent();
    refreshTray();
  });
  ipcMain.handle("setObs", (_e, v: { host?: string; port?: number; password?: string }) => {
    cfg.obs = { host: String(v.host || "127.0.0.1").slice(0, 100), port: Math.min(65535, Math.max(1, Number(v.port) || 4455)), password: typeof v.password === "string" && v.password !== "" ? v.password : cfg.obs.password };
    if (v.password === "") cfg.obs.password = "";
    save(cfg);
    startAgent();
  });
  ipcMain.handle("setBackup", (_e, v: unknown) => {
    cfg.backup = cleanBackup(v, cfg.backup);
    save(cfg);
    agent?.setBackup(cfg.backup);
    push();
  });
  ipcMain.handle("options", async () => {
    try {
      const [sl, il] = await Promise.all([agent!.obsRequest("GetSceneList"), agent!.obsRequest("GetInputList")]);
      return { scenes: ((sl.scenes as { sceneName: string }[]) ?? []).map((s) => s.sceneName).reverse(), inputs: ((il.inputs as { inputName: string }[]) ?? []).map((i) => i.inputName) };
    } catch {
      return { scenes: [], inputs: [] };
    }
  });
  ipcMain.handle("autostart", (_e, on: unknown) => {
    app.setLoginItemSettings({ openAtLogin: bool(on), args: ["--hidden"] });
    push();
  });
  ipcMain.handle("open", (_e, url: unknown) => {
    if (typeof url === "string" && /^https:\/\/(syxtee-networks\.vercel\.app|discord\.gg)\//.test(url)) void shell.openExternal(url);
  });

  startAgent();
  // Au démarrage de session (ouverture automatique), l'app reste dans la barre de menu.
  if (!process.argv.includes("--hidden") || !cfg.token) showWindow();
});

app.on("before-quit", () => {
  quitting = true;
  agent?.stop();
});
app.on("window-all-closed", () => {});
app.on("activate", showWindow);
