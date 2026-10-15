"use client";

// Dernier filet : remplace le layout racine, donc sans globals.css ni polices. Styles en ligne minimaux,
// couleurs suivant le thème du système (pas de jetons disponibles ici).
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0 }}>
        <style>{`
          .ge { min-height: 100dvh; display: grid; place-items: center; padding: 24px; font-family: system-ui, sans-serif; background: #1a1a1a; color: #f2f2f2; }
          .ge p { color: #b5b5b5; max-width: 32rem; line-height: 1.6; }
          .ge button { height: 44px; padding: 0 22px; border: 0; border-radius: 999px; background: #e5322d; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
          .ge button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
          @media (prefers-color-scheme: light) { .ge { background: #f6f6f6; color: #151515; } .ge p { color: #555; } }
        `}</style>
        <main className="ge">
          <div>
            <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", lineHeight: 1.05, margin: 0 }}>Le site a coupé.</h1>
            <p>Une erreur a empêché l&apos;affichage. Réessaie dans un instant.{error.digest ? ` Code : ${error.digest}` : ""}</p>
            <button type="button" onClick={() => retry()}>Réessayer</button>
          </div>
        </main>
      </body>
    </html>
  );
}
