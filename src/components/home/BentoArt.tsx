import type { ReactNode } from "react";

// Petits dessins filaires du bento de l'accueil (Santé du flux, Aperçu et stats, Clés). Trait blanc, pas de remplissage.
// Les animations sont en pause et jouent au survol de la carte (classe .hover-play du parent), comme les illustrations des services.

const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 240 130" className="h-full w-full text-foreground" role="img" aria-label={label} {...common}>
      {children}
    </svg>
  );
}

/** Santé du flux : courbe de débit sur une grille, avec un creux puis la reprise. */
export function HealthArt() {
  return (
    <Frame label="Courbe de débit en direct">
      <rect x="8" y="10" width="224" height="110" rx="10" />
      <path d="M8 40H232M8 65H232M8 90H232" opacity={0.25} strokeDasharray="2 5" />
      <path className="flow-line" d="M18 84L48 70L72 76L100 48L124 56L146 100L164 74L192 40L222 46" strokeDasharray="6 6" />
      <circle cx="146" cy="100" r="3.5" />
      <path d="M146 100V118" opacity={0.4} strokeDasharray="2 3" />
    </Frame>
  );
}

/** Aperçu et stats : un écran avec la lecture du flux, et trois barres de statistiques. */
export function PreviewArt() {
  return (
    <Frame label="Aperçu vidéo et statistiques">
      <rect x="16" y="14" width="136" height="88" rx="8" />
      <path d="M72 42L102 58L72 74Z" />
      <path d="M16 112H152" opacity={0.4} />
      <path d="M32 112V118M84 112V118M136 112V118" opacity={0.4} />
      <path d="M172 102V70M194 102V44M216 102V58" strokeWidth={5} opacity={0.85} />
      <path d="M164 108H224" opacity={0.4} />
    </Frame>
  );
}

/** Clés uniques : une clé et son verrou. */
export function KeyArt() {
  return (
    <Frame label="Clé de stream chiffrée">
      <circle cx="72" cy="65" r="26" />
      <circle cx="72" cy="65" r="8" />
      <path d="M98 65H196M168 65V84M186 65V80" />
      <rect x="150" y="98" width="62" height="22" rx="5" opacity={0.5} />
      <path d="M162 109H200" opacity={0.5} strokeDasharray="2 4" />
    </Frame>
  );
}
