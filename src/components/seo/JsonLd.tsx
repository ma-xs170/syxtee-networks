// Données structurées schema.org, lues par Google pour les extraits enrichis.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // « < » échappé : un texte contenant </script> ne peut pas fermer la balise.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
