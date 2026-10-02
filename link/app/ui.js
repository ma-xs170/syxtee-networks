const $ = (id) => document.getElementById(id);
const STUDIO = "https://syxtee-networks.vercel.app/studio";
let state = null;
let options = { scenes: [], inputs: [] };
let optionsFor = "";

const dot = (id, cls) => ($(id).className = "dot" + (cls ? " " + cls : ""));

function fill(select, items, value, empty) {
  const list = items.includes(value) || !value ? items : [value, ...items];
  select.innerHTML = "";
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = empty;
  select.appendChild(o0);
  for (const it of list) {
    const o = document.createElement("option");
    o.value = it;
    o.textContent = it;
    select.appendChild(o);
  }
  select.value = value || "";
}

function render(s) {
  state = s;
  $("ver").textContent = "v" + s.version;
  $("unpaired").hidden = s.paired;
  $("paired").hidden = !s.paired;
  const on = s.status.core === "on" && s.status.obs === "on";
  dot("top-dot", on ? "on" : "");
  $("top-text").textContent = !s.paired ? "Non appairé" : on ? "Connecté" : s.status.obs !== "on" ? "OBS injoignable" : "Hors ligne";
  if (!s.paired) return;

  const core = { on: "Connecté", connecting: "Connexion…", off: "Hors ligne" }[s.status.core];
  const obs = { on: "Connecté", connecting: "Connexion…", off: "Injoignable" }[s.status.obs];
  $("core-text").textContent = core;
  dot("core-dot", s.status.core === "on" ? "on" : "");
  $("obs-text").textContent = obs;
  dot("obs-dot", s.status.obs === "on" ? "on" : "");
  $("obs-sub").textContent = s.status.obsVersion ? `OBS ${s.status.obsVersion}` : "obs-websocket, port " + s.obs.port;
  const bk = s.backup;
  const bst = !bk.enabled ? "Désactivé" : s.status.backup === "backup" ? "Secours actif" : s.status.backup === "frozen" ? "Image figée…" : "Actif";
  $("bk-text").textContent = bst;
  dot("bk-dot", s.status.backup === "backup" ? "live" : bk.enabled ? "on" : "");
  $("bk-sub").textContent = bk.enabled ? `${bk.source || "?"} vers ${bk.scene || "?"}` : "désactivé";
  $("last-err").hidden = !s.status.lastError;
  $("last-err").textContent = s.status.lastError;
  const logs = $("logs");
  const bottom = logs.scrollTop + logs.clientHeight >= logs.scrollHeight - 8;
  logs.textContent = s.logs.length ? s.logs.join("\n") : "Rien pour l'instant.";
  if (bottom) logs.scrollTop = logs.scrollHeight;

  // Réglages : ne pas écraser un champ en cours de saisie.
  if (document.activeElement !== $("obs-host")) $("obs-host").value = s.obs.host;
  if (document.activeElement !== $("obs-port")) $("obs-port").value = s.obs.port;
  $("obs-pw").placeholder = s.obs.hasPassword ? "Inchangé" : "Aucun";
  $("autostart").checked = s.autostart;
  $("bk-on").checked = bk.enabled;
  $("bk-on").disabled = !bk.source || !bk.scene;
  fill($("bk-source"), options.inputs, bk.source, "Choisir…");
  fill($("bk-scene"), options.scenes, bk.scene, "Choisir…");
  $("bk-freeze").value = String(bk.freezeSeconds);
  // Les listes viennent d'OBS : on les recharge quand il se connecte.
  const key = s.status.obs === "on" ? "on" : "off";
  if (key === "on" && optionsFor !== "on") loadOptions();
  optionsFor = key;
}

async function loadOptions() {
  options = await window.link.options();
  if (state) render(state);
}

for (const b of document.querySelectorAll("[data-tab]")) {
  b.addEventListener("click", () => {
    for (const t of document.querySelectorAll("[data-tab]")) {
      t.setAttribute("aria-selected", String(t === b));
      $("tab-" + t.dataset.tab).hidden = t !== b;
    }
    if (b.dataset.tab === "settings") void loadOptions();
  });
}

$("pair").addEventListener("click", async () => {
  $("pair-err").hidden = true;
  $("pair").disabled = true;
  const r = await window.link.pair($("code").value);
  $("pair").disabled = false;
  if (r.error) {
    $("pair-err").textContent = r.error;
    $("pair-err").hidden = false;
  } else $("code").value = "";
});
$("code").addEventListener("keydown", (e) => e.key === "Enter" && $("pair").click());
$("open-studio").addEventListener("click", () => window.link.open(STUDIO));
$("unpair").addEventListener("click", () => window.link.unpair());
$("autostart").addEventListener("change", (e) => window.link.autostart(e.target.checked));
$("obs-save").addEventListener("click", () => {
  window.link.setObs({ host: $("obs-host").value, port: Number($("obs-port").value), password: $("obs-pw").value });
  $("obs-pw").value = "";
});
const saveBackup = (patch) => window.link.setBackup({ ...state.backup, ...patch });
$("bk-source").addEventListener("change", (e) => saveBackup({ source: e.target.value }));
$("bk-scene").addEventListener("change", (e) => saveBackup({ scene: e.target.value }));
$("bk-freeze").addEventListener("change", (e) => saveBackup({ freezeSeconds: Number(e.target.value) }));
$("bk-on").addEventListener("change", (e) => saveBackup({ enabled: e.target.checked }));

window.link.onState(render);
window.link.state().then(render);
