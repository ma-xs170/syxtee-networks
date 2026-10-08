// Un Mac (bordure de MacBook, encoche, logo Apple) et un PC Windows (écran fin sur pied, logo Windows). Traits en couleur d'encre : valable en clair comme en sombre.
export default function MacAndPc({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 220" role="img" aria-label="Un Mac et un PC Windows" className={`h-auto w-full text-foreground ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {/* Mac : couvercle à coins arrondis, encoche, base fine */}
      <g>
        <rect x="14" y="26" width="226" height="146" rx="12" fill="currentColor" fillOpacity="0.05" />
        <rect x="22" y="34" width="210" height="130" rx="6" strokeOpacity="0.45" />
        <path d="M108 34h38v6a4 4 0 0 1-4 4h-30a4 4 0 0 1-4-4z" fill="currentColor" fillOpacity="0.9" stroke="none" />
        <path d="M2 176h250a0 0 0 0 1 0 0v2a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8z" fill="currentColor" fillOpacity="0.08" />
        <path d="M110 176h34" strokeOpacity="0.5" />
        <g transform="translate(127 99) scale(1.8)" fill="currentColor" stroke="none">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" transform="translate(-12 -12)" />
        </g>
      </g>
      {/* PC Windows : écran à fines bordures droites, pied et socle */}
      <g>
        <rect x="290" y="22" width="216" height="138" rx="2" fill="currentColor" fillOpacity="0.05" />
        <rect x="296" y="28" width="204" height="126" strokeOpacity="0.45" />
        <path d="M388 160l-6 24h32l-6-24M368 184h72" />
        <g transform="translate(376 67.5)" fill="currentColor" stroke="none">
          <path d="M0 4.5 11 3v10H0zM12.5 2.8 26 1v12H12.5zM0 14.5h11v10L0 23zM12.5 14.5H26v12l-13.5-1.8z" transform="scale(1.7)" />
        </g>
      </g>
    </svg>
  );
}
