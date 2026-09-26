// Antenne satellite plate rectangulaire sur sa béquille, vue de 3/4. Générique, sans logo.
export default function DishMini({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 320" className={className} fill="none" aria-hidden="true">
      {/* Ombre au sol */}
      <ellipse cx="176" cy="292" rx="96" ry="10" fill="#fff" fillOpacity="0.06" />

      {/* Béquille */}
      <path d="M186 168 L208 284" stroke="#737373" strokeWidth="10" strokeLinecap="round" />
      <path d="M190 284 L228 284" stroke="#737373" strokeWidth="8" strokeLinecap="round" />
      <path d="M180 150 L196 176" stroke="#525252" strokeWidth="14" strokeLinecap="round" />

      {/* Épaisseur de la coque */}
      <path d="M62 78 L234 44 L278 196 L100 240 Z" fill="#525252" transform="translate(6 10)" />
      <path d="M100 240 L278 196 L284 206 L106 250 Z" fill="#404040" />
      <path d="M278 196 L234 44 L240 54 L284 206 Z" fill="#3a3a3a" />

      {/* Face avant */}
      <path d="M62 78 L234 44 L278 196 L100 240 Z" fill="#f5f5f5" />
      <path d="M62 78 L234 44 L278 196 L100 240 Z" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />

      {/* Relief discret de la face */}
      <path d="M80 90 L226 61 L262 188 L112 225 Z" stroke="#d4d4d4" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M171 70 L187 208" stroke="#e5e5e5" strokeWidth="1" />
      <path d="M94 157 L244 124" stroke="#e5e5e5" strokeWidth="1" />
    </svg>
  );
}
