// Interface locale de SYXTEE Link (page servie sur 127.0.0.1) : connexion au compte, sauvegarde des scènes, état, réglages.
// HTML, CSS et JS dans un seul texte (pas de fichier à embarquer dans l'exécutable). Le jeton __CSRF__ est remplacé à chaque envoi.
// Dans le JS, pas de guillemets inversés ni de ${} : le tout est un texte TypeScript.

export const PANEL = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>SYXTEE Link</title>
<style>
:root{color-scheme:dark;--bg:#0e0e11;--surface:#141418;--fg:#f5f5f5;--muted:#9a9aa3;--line:rgba(255,255,255,.09);--line2:rgba(255,255,255,.2);--live:#ff3b30}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:560px;margin:0 auto;padding:28px 20px 60px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:22px}
h1{margin:0;font-size:13px;font-weight:600;letter-spacing:.18em}h1 span{font-weight:400;color:var(--muted)}
.pill{font:12px ui-monospace,Menlo,monospace;color:var(--muted);display:inline-flex;align-items:center;gap:8px}
.dot{width:7px;height:7px;border-radius:50%;background:#444;display:inline-block}.dot.on{background:var(--fg);box-shadow:0 0 0 3px rgba(255,255,255,.12)}.dot.live{background:var(--live)}
nav{display:flex;gap:22px;border-bottom:1px solid var(--line);margin-bottom:20px}
nav button{background:none;border:0;color:var(--muted);font:inherit;padding:8px 0 10px;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
nav button[aria-selected=true]{color:var(--fg);border-bottom-color:var(--fg)}
h2{margin:24px 0 4px;font:11px ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);font-weight:500}h2:first-child{margin-top:0}
p.sub{margin:0 0 10px;color:var(--muted);font-size:12.5px}
.card{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}
.row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 16px}.row+.row{border-top:1px solid var(--line)}
.row b{font-weight:500;display:block}.row small{color:var(--muted);font-size:12px;display:block}
.state{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.btn{height:38px;padding:0 18px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--fg);font:inherit;font-weight:500;cursor:pointer;white-space:nowrap}
.btn:hover{background:rgba(255,255,255,.08)}.btn.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}.btn.primary:hover{background:#fff}.btn:disabled{opacity:.4;cursor:default}
.btn.big{height:46px;width:100%}
select,input{width:100%;height:40px;border-radius:10px;border:1px solid var(--line2);background:var(--bg);color:var(--fg);font:inherit;padding:0 12px}
label.f{display:grid;gap:4px;font-size:12px;color:var(--muted)}.grid{display:grid;gap:10px;padding:14px 16px}
.hero{text-align:center;padding:30px 0 6px}.hero h2{color:var(--fg);font:600 22px -apple-system,Inter,sans-serif;letter-spacing:-.01em;text-transform:none;margin:0 0 8px}
.hero p{color:var(--muted);margin:0 auto 22px;max-width:36ch}
.code{font:600 30px ui-monospace,Menlo,monospace;letter-spacing:.3em;margin:18px 0 6px}
.bar{height:6px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:10px}.bar i{display:block;height:100%;background:var(--fg);transition:width .3s}
.err{color:#ff6b6b;font-size:13px;margin:10px 0 0}.ok{color:var(--fg)}
.switch{position:relative;width:44px;height:26px;flex:none}.switch input{position:absolute;inset:0;opacity:0;width:100%;height:100%;cursor:pointer;margin:0}
.switch i{position:absolute;inset:0;border-radius:999px;background:#2a2a30;pointer-events:none;transition:background .15s}
.switch i:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#888;transition:transform .15s,background .15s}
.switch input:checked+i{background:var(--fg)}.switch input:checked+i:after{transform:translateX(18px);background:var(--bg)}
pre{margin:0;padding:12px 16px;font:11.5px/1.6 ui-monospace,Menlo,monospace;color:var(--muted);max-height:180px;overflow:auto;white-space:pre-wrap;word-break:break-word}
.meter{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:6px}
[hidden]{display:none!important}
</style></head><body><main>
<header><h1>SYXTEE <span>LINK</span></h1><span class="pill"><span id="topdot" class="dot"></span><span id="toptext">…</span></span></header>

<section id="login" hidden>
  <div class="hero"><h2>Connecte ce PC à ton compte</h2><p>Une page de syxtee-networks s'ouvre dans ton navigateur. Connecte-toi, confirme le code, et c'est fait.</p>
    <button class="btn primary big" id="loginbtn">Se connecter</button>
    <div id="waiting" hidden><div class="code" id="usercode"></div><p>En attente de ta confirmation sur le site…</p><button class="btn" id="reopen">Rouvrir la page</button> <button class="btn" id="cancel">Annuler</button></div>
    <p class="err" id="loginerr" hidden></p></div>
</section>

<section id="onboard" hidden>
  <div class="hero"><h2>Sauvegarde tes scènes d'abord</h2><p>Tes scènes OBS et leurs médias sont copiés sur ton espace SYXTEE (5 Go). Tu les retrouves sur n'importe quel PC, et le Studio du site peut commander ton OBS.</p></div>
  <div class="card"><div class="grid"><label class="f">Collection de scènes<select id="obcol"></select></label><div class="meter"><span id="obinfo">…</span></div>
    <div id="obprog" hidden><div class="bar"><i id="obbar" style="width:0"></i></div><div class="meter"><span id="obmsg"></span></div></div></div></div>
  <p class="err" id="oberr" hidden></p>
  <div style="display:grid;gap:10px;margin-top:14px"><button class="btn primary big" id="obgo">Sauvegarder mes scènes</button><button class="btn big" id="obskip">Plus tard</button></div>
</section>

<section id="app" hidden>
  <nav role="tablist"><button role="tab" aria-selected="true" data-tab="live">Direct</button><button role="tab" aria-selected="false" data-tab="scenes">Scènes</button><button role="tab" aria-selected="false" data-tab="settings">Réglages</button></nav>

  <div id="tab-live">
    <h2>Connexions</h2>
    <div class="card">
      <div class="row"><div><b>Serveur SYXTEE</b><small>télécommande Studio</small></div><span class="state"><span class="dot" id="coredot"></span><span id="coretext"></span></span></div>
      <div class="row"><div><b>OBS Studio</b><small id="obssub">obs-websocket</small></div><span class="state"><span class="dot" id="obsdot"></span><span id="obstext"></span></span></div>
      <div class="row"><div><b>SYXTEE Studio (site)</b><small id="viewsub">ouvert sur le site</small></div><span class="state"><span class="dot" id="viewdot"></span><span id="viewtext"></span></span></div>
    </div>
    <p class="err" id="lasterr" hidden></p>
    <h2>Activité</h2><div class="card"><pre id="logs"></pre></div>
  </div>

  <div id="tab-scenes" hidden>
    <h2>Sauvegarder</h2><p class="sub">Collection de scènes OBS avec ses médias.</p>
    <div class="card"><div class="grid"><label class="f">Collection<select id="col"></select></label><div class="meter"><span id="colinfo">…</span></div>
      <div id="prog" hidden><div class="bar"><i id="bar" style="width:0"></i></div><div class="meter"><span id="msg"></span></div></div>
      <div><button class="btn primary" id="gobackup">Sauvegarder maintenant</button></div></div></div>
    <h2>Mon espace</h2><p class="sub" id="space">…</p>
    <div class="card" id="cloud"></div>
  </div>

  <div id="tab-settings" hidden>
    <h2>Backup de scène</h2><p class="sub">Si l'image de la source se fige, OBS passe sur ta scène de secours puis revient.</p>
    <div class="card"><div class="grid"><label class="f">Source surveillée<select id="bksource"></select></label><label class="f">Scène de secours<select id="bkscene"></select></label>
      <label class="f">Bascule après<select id="bkfreeze"><option value="2">2 s d'image figée</option><option value="3">3 s</option><option value="4">4 s</option><option value="6">6 s</option><option value="10">10 s</option></select></label></div>
      <div class="row"><div><b>Bascule automatique</b><small>Passe seul sur la scène de secours.</small></div><label class="switch"><input type="checkbox" id="bkon" aria-label="Bascule automatique" /><i></i></label></div></div>
    <h2>OBS</h2><p class="sub" id="obshint">Les réglages WebSocket d'OBS sont détectés automatiquement.</p>
    <div class="card"><div class="grid"><label class="f">Mot de passe imposé (laisser vide pour la détection automatique)<input id="obspw" type="password" autocomplete="off" /></label><div><button class="btn" id="obssave">Enregistrer</button></div></div></div>
    <h2>Compte</h2>
    <div class="card"><div class="row"><div><b>Ce PC est relié à ton compte</b><small>Retire aussi l'appareil dans SYXTEE Studio.</small></div><button class="btn" id="unpair">Déconnecter</button></div></div>
  </div>
</section></main>
<script>
var CSRF="__CSRF__";
function $(id){return document.getElementById(id)}
function api(path,body){return fetch(path,{method:body===undefined?"GET":"POST",headers:{"x-syxtee":CSRF,"content-type":"application/json"},body:body===undefined?undefined:JSON.stringify(body)}).then(function(r){return r.json()})}
var S=null,cols=[],cloudLoaded=false,lastJob="";
function fmt(n){return n>=1e9?(n/1e9).toFixed(1)+" Go":n>=1e6?(n/1e6).toFixed(0)+" Mo":Math.max(1,Math.round(n/1e3))+" Ko"}
function dot(id,c){$(id).className="dot"+(c?" "+c:"")}
function fill(sel,items,val,empty){var h='<option value="">'+empty+"</option>";var list=items.slice();if(val&&list.indexOf(val)<0)list.unshift(val);list.forEach(function(x){var o=document.createElement("option");o.textContent=x;o.value=x;h+=o.outerHTML});sel.innerHTML=h;sel.value=val||""}
function render(s){
  S=s;
  var paired=s.paired,onboard=paired&&!s.onboarded;
  $("login").hidden=paired;$("onboard").hidden=!onboard;$("app").hidden=!(paired&&s.onboarded);
  var on=s.status.core==="on"&&s.status.obs==="on";
  dot("topdot",on?"on":"");$("toptext").textContent=!paired?"Non connecté":on?"Connecté":s.status.obs!=="on"?"OBS injoignable":"Hors ligne";
  if(!paired){
    var w=s.login.state==="waiting";$("waiting").hidden=!w;$("loginbtn").hidden=w;
    if(w)$("usercode").textContent=s.login.userCode;
    $("loginerr").hidden=s.login.state!=="error";if(s.login.state==="error")$("loginerr").textContent=s.login.message;
    return}
  var j=s.status.job;
  if(onboard){if(!cols.length)loadCols();job("ob",j);return}
  var names={on:"Connecté",connecting:"Connexion…",off:"Hors ligne"};
  $("coretext").textContent=names[s.status.core];dot("coredot",s.status.core==="on"?"on":"");
  $("obstext").textContent=s.status.obs==="on"?"Connecté":s.status.obs==="connecting"?"Connexion…":"Injoignable";dot("obsdot",s.status.obs==="on"?"on":"");
  $("obssub").textContent=s.status.obsVersion?"OBS "+s.status.obsVersion:"obs-websocket";
  $("viewtext").textContent=s.status.viewers>0?"Ouvert ("+s.status.viewers+")":"Fermé";dot("viewdot",s.status.viewers>0?"on":"");
  $("lasterr").hidden=!s.status.lastError;$("lasterr").textContent=s.status.lastError||"";
  var lg=$("logs"),bottom=lg.scrollTop+lg.clientHeight>=lg.scrollHeight-8;lg.textContent=s.logs.length?s.logs.join("\\n"):"Rien pour l'instant.";if(bottom)lg.scrollTop=lg.scrollHeight;
  job("",j);
  var b=s.backup;$("bkon").checked=b.enabled;$("bkon").disabled=!b.source||!b.scene;$("bkfreeze").value=String(b.freezeSeconds);
  if(document.activeElement.id!=="bksource"&&document.activeElement.id!=="bkscene")loadOptions();
  $("obshint").textContent=s.obsCustom?"Mot de passe imposé enregistré.":"Les réglages WebSocket d'OBS sont détectés automatiquement."
}
function job(p,j){
  var prog=$(p?"obprog":"prog"),bar=$(p?"obbar":"bar"),msg=$(p?"obmsg":"msg"),err=$(p?"oberr":"msgerr"),go=$(p?"obgo":"gobackup");
  var run=j&&j.state==="running";
  if(prog)prog.hidden=!(j&&(run||j.state==="done"||(!p&&j.state==="error")));
  if(bar)bar.style.width=(j?Math.round(j.progress*100):0)+"%";
  if(msg)msg.textContent=j?j.message:"";
  if(go)go.disabled=!!run;
  if(p&&err){err.hidden=!(j&&j.state==="error");if(j&&j.state==="error")err.textContent=j.message}
  var key=j?j.state+j.message:"";
  if(j&&j.state==="done"&&key!==lastJob){lastJob=key;cloudLoaded=false;if(p){api("/api/onboarded",{}).then(function(){})}if($("tab-scenes")&&!$("tab-scenes").hidden)loadCloud()}
}
function loadCols(){api("/api/collections").then(function(r){cols=r.collections||[];["obcol","col"].forEach(function(id){var h="";cols.forEach(function(c){var o=document.createElement("option");o.value=c.name;o.textContent=c.name;h+=o.outerHTML});$(id).innerHTML=h||'<option value="">Aucune collection</option>'});info()})}
function info(){["ob","col"].forEach(function(p){var id=p==="ob"?"obcol":"col",el=$(p==="ob"?"obinfo":"colinfo");var c=cols.filter(function(x){return x.name===$(id).value})[0];el.textContent=c?c.media+" média"+(c.media>1?"s":"")+" · "+fmt(c.bytes)+" avant compression":"Aucune collection trouvée dans OBS."})}
function loadCloud(){api("/api/cloud").then(function(r){cloudLoaded=true;var el=$("cloud");if(r.error){el.innerHTML='<div class="row"><small>'+r.error+"</small></div>";return}
  $("space").textContent=fmt(r.used)+" utilisés sur "+fmt(r.quota);
  if(!r.backups.length){el.innerHTML='<div class="row"><small>Aucune sauvegarde pour l\\'instant.</small></div>';return}
  el.innerHTML="";r.backups.forEach(function(b){var d=document.createElement("div");d.className="row";var l=document.createElement("div");var t=document.createElement("b");t.textContent=b.name;var sm=document.createElement("small");sm.textContent=new Date(b.created_at).toLocaleString("fr-FR")+" · "+fmt(b.size)+" · "+b.media_count+" média"+(b.media_count>1?"s":"");l.appendChild(t);l.appendChild(sm);var bt=document.createElement("button");bt.className="btn";bt.textContent="Restaurer";bt.onclick=function(){bt.disabled=true;api("/api/restore",{id:b.id})};d.appendChild(l);d.appendChild(bt);el.appendChild(d)})})}
var opts={scenes:[],inputs:[]};
function loadOptions(){api("/api/options").then(function(o){opts=o;fill($("bksource"),o.inputs,S.backup.source,"Choisir…");fill($("bkscene"),o.scenes,S.backup.scene,"Choisir…")})}
function sw(patch){var b=Object.assign({},S.backup,patch);api("/api/switch",b)}
document.querySelectorAll("[data-tab]").forEach(function(b){b.onclick=function(){document.querySelectorAll("[data-tab]").forEach(function(t){t.setAttribute("aria-selected",String(t===b));$("tab-"+t.dataset.tab).hidden=t!==b});if(b.dataset.tab==="scenes"){loadCols();loadCloud()}if(b.dataset.tab==="settings")loadOptions()}});
$("loginbtn").onclick=function(){api("/api/login/start",{})};$("reopen").onclick=function(){api("/api/login/reopen",{})};$("cancel").onclick=function(){api("/api/login/cancel",{})};
$("obcol").onchange=info;$("col").onchange=info;
$("obgo").onclick=function(){if($("obcol").value)api("/api/backup",{collection:$("obcol").value})};
$("obskip").onclick=function(){api("/api/onboarded",{})};
$("gobackup").onclick=function(){if($("col").value)api("/api/backup",{collection:$("col").value})};
$("bksource").onchange=function(e){sw({source:e.target.value})};$("bkscene").onchange=function(e){sw({scene:e.target.value})};
$("bkfreeze").onchange=function(e){sw({freezeSeconds:Number(e.target.value)})};$("bkon").onchange=function(e){sw({enabled:e.target.checked})};
$("obssave").onclick=function(){api("/api/obs",{password:$("obspw").value});$("obspw").value=""};
$("unpair").onclick=function(){api("/api/unpair",{})};
function tick(){api("/api/state").then(render).catch(function(){$("toptext").textContent="Application arrêtée"})}
tick();setInterval(tick,1200);
</script></body></html>`;
