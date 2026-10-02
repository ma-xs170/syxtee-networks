import { Agent, VERSION } from "./agent.ts";
import { dir, load, save } from "./config.ts";
import { claimCode } from "./pair.ts";

// SYXTEE Link : agent du PC d'OBS.
//   syxtee-link pair CODE        associe ce PC à ton compte (code affiché dans SYXTEE Studio, onglet Télécommande)
//   syxtee-link obs [hôte:port] [mot de passe]   règle la connexion à OBS (défaut 127.0.0.1:4455)
//   syxtee-link run              lance l'agent (par défaut)
//   syxtee-link unpair           oublie l'appairage de ce PC

const [cmd = "run", ...args] = process.argv.slice(2);
const cfg = load();

async function pair(code?: string) {
  if (!code) return fail("Usage : syxtee-link pair CODE (le code s'affiche dans SYXTEE Studio, onglet Télécommande).");
  const r = await claimCode(cfg.core, code);
  if ("error" in r) return fail(r.error);
  cfg.token = r.token;
  save(cfg);
  console.log(`Appairé. Configuration dans ${dir()}. Lance maintenant : syxtee-link run`);
}

function fail(m: string): never {
  console.error(m);
  process.exit(1);
}

async function main() {
if (cmd === "pair") await pair(args[0]);
else if (cmd === "unpair") {
  cfg.token = "";
  save(cfg);
  console.log("Appairage supprimé sur ce PC. Retire aussi l'appareil dans SYXTEE Studio.");
} else if (cmd === "obs") {
  const [hp = "127.0.0.1:4455", password] = args;
  const [host, port] = hp.split(":");
  cfg.obs = { host: host || "127.0.0.1", port: Number(port) || 4455, password: password ?? cfg.obs.password };
  save(cfg);
  console.log(`OBS : ${cfg.obs.host}:${cfg.obs.port}${cfg.obs.password ? " (mot de passe enregistré)" : ""}`);
} else if (cmd === "run") {
  if (!cfg.token) fail("Pas encore appairé. Lance : syxtee-link pair CODE");
  const stamp = () => new Date().toLocaleTimeString("fr-FR");
  const agent = new Agent(cfg, (m) => console.log(`${stamp()}  ${m}`));
  let line = "";
  agent.onStatus = (s) => {
    const next = `Serveur ${s.core} · OBS ${s.obs}${s.obsVersion ? ` ${s.obsVersion}` : ""} · backup ${s.backup}`;
    if (next !== line) console.log(`${stamp()}  ${(line = next)}`);
  };
  console.log(`SYXTEE Link ${VERSION}`);
  agent.start();
  for (const sig of ["SIGINT", "SIGTERM"] as const)
    process.on(sig, () => {
      agent.stop();
      process.exit(0);
    });
} else fail(`Commande inconnue : ${cmd}`);
}

main().catch((e) => fail(String(e?.message ?? e)));
