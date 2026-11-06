import type { Metadata } from "next";
import { AppleLogo, WindowsLogo } from "@phosphor-icons/react/dist/ssr";
import { Container } from "@/components/ui";
import { buttonClass } from "@/components/ui/button-styles";
import app from "@/config/dashboard-app.json";

export const metadata: Metadata = {
  title: "SYXTEE Dashboard pour Mac et Windows",
  description: "Télécharge l'application SYXTEE Dashboard : ton dashboard dans sa propre fenêtre, connexion en un clic depuis le navigateur.",
  alternates: { canonical: "/telecharger" },
};

const BASE = "https://github.com/ma-xs170/syxtee-networks/releases/download/dashboard-latest";
const date = new Date(app.released_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// Page de téléchargement : fichiers publiés par .github/workflows/dashboard-app.yml, version et nouveautés dans src/config/dashboard-app.json.
export default function TelechargerPage() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">Application · v{app.version}</p>
        <h1 className="h-hero mt-4">SYXTEE Dashboard sur ton <em>ordinateur.</em></h1>
        <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted sm:text-lg">Ton dashboard dans sa propre fenêtre. Tu te connectes d&apos;un clic depuis ton navigateur, sans retaper ton mot de passe.</p>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href={`${BASE}/SYXTEE-Dashboard-mac.zip`} className={buttonClass("primary")}>
            <AppleLogo size={18} weight="fill" aria-hidden="true" /> Télécharger pour Mac
          </a>
          <a href={`${BASE}/SYXTEE-Dashboard-windows.exe`} className={buttonClass("secondary")}>
            <WindowsLogo size={18} weight="fill" aria-hidden="true" /> Télécharger pour Windows
          </a>
        </div>
        <p className="mt-3 font-mono text-xs text-muted">macOS 13 ou plus · Windows 10 ou plus</p>

        <div className="mt-16 border-t border-line pt-10">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">Nouveautés · v{app.version} · {date}</h2>
          <ul className="mt-5 space-y-3">
            {app.notes.map((n) => (
              <li key={n} className="max-w-[60ch] text-sm leading-relaxed text-foreground">{n}</li>
            ))}
          </ul>
        </div>

        <div className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sur Mac</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">Ouvre l&apos;archive, glisse l&apos;app dans Applications. Au premier lancement, macOS la bloque car elle n&apos;est pas encore signée par Apple : va dans Réglages Système, Confidentialité et sécurité, puis « Ouvrir quand même ».</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sur Windows</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">Lance l&apos;installeur. Si Windows affiche « Protégé votre PC », clique sur « Informations complémentaires » puis « Exécuter quand même ».</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
