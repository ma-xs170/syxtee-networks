/** Titre statique. `em` : mots passés en italique serif gris. */
export default function WordsReveal({ text, em = [], className = "" }: { text: string; em?: string[]; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={i} className={em.includes(w) ? "italic text-muted" : undefined}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}
