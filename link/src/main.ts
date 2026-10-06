import { dir, load, save } from "./config.ts";
import { startHelper } from "./helper.ts";
import { claimCode } from "./pair.ts";
import { setTokens } from "./tokens.ts";
import { openUrl } from "./system.ts";

// Agent SYXTEE Link. Lancé par le plugin OBS (syxtee-link --parent-pid <pid>), ou à la main :
//   syxtee-link run            lance l'agent (par défaut), page de réglages sur http://127.0.0.1:47831
//   syxtee-link pair CODE      associe ce PC avec un code généré dans SYXTEE Studio (alternative à la connexion par le navigateur)
//   syxtee-link unpair         oublie la connexion de ce PC
//   syxtee-link panel          ouvre la page de réglages

const argv = process.argv.slice(2);
const pidAt = argv.indexOf("--parent-pid");
const parentPid = pidAt >= 0 ? Number(argv[pidAt + 1]) || undefined : undefined;
const cmd = argv.find((a, i) => !a.startsWith("--") && argv[i - 1] !== "--parent-pid") ?? "run";

function fail(m: string): never {
  console.error(m);
  process.exit(1);
}

async function main() {
  const cfg = load();
  if (cmd === "pair") {
    const code = argv[argv.indexOf("pair") + 1];
    if (!code) return fail("Usage : syxtee-link pair CODE");
    const r = await claimCode(cfg.core, code);
    if ("error" in r) return fail(r.error);
    setTokens(cfg, r);
    cfg.onboarded = false;
    save(cfg);
    console.log(`Connecté. Configuration dans ${dir()}.`);
  } else if (cmd === "unpair") {
    cfg.token = "";
    cfg.refresh = "";
    cfg.expires = 0;
    save(cfg);
    console.log("Ce PC est déconnecté. Retire aussi l'appareil dans SYXTEE Studio.");
  } else if (cmd === "panel") {
    openUrl("http://127.0.0.1:47831/");
  } else if (cmd === "run") {
    const stamp = () => new Date().toLocaleTimeString("fr-FR");
    const h = startHelper({ parentPid, log: (m) => console.log(`${stamp()}  ${m}`) });
    console.log("SYXTEE Link : réglages sur http://127.0.0.1:47831");
    for (const sig of ["SIGINT", "SIGTERM"] as const)
      process.on(sig, () => {
        h.stop();
        process.exit(0);
      });
  } else fail(`Commande inconnue : ${cmd}`);
}

main().catch((e) => fail(String((e as Error)?.message ?? e)));
