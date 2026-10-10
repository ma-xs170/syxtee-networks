import { siKick, siTwitch, siYoutube } from "simple-icons";

// Bandeau « DIFFUSE SUR » : YouTube, Twitch, Kick puis « +50 » (plus de 50 plateformes), logos monochromes à 60 % (100 % au survol). Seules marques tierces du site public.
const P = [
  { label: "YouTube", icon: siYoutube },
  { label: "Twitch", icon: siTwitch },
  { label: "Kick", icon: siKick },
];

export default function PlatformStrip() {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Diffuse sur</p>
      <ul className="flex items-center justify-center gap-10">
        {P.map((p) => (
          <li key={p.label} className="text-foreground opacity-60 transition-opacity duration-200 hover:opacity-100">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" role="img" aria-label={p.label}>
              <path d={p.icon.path} />
            </svg>
          </li>
        ))}
        <li className="font-mono text-2xl font-semibold leading-none text-foreground opacity-60 transition-opacity duration-200 hover:opacity-100">
          <span aria-hidden="true">+50</span>
          <span className="sr-only">Plus de 50 autres plateformes</span>
        </li>
      </ul>
    </div>
  );
}
