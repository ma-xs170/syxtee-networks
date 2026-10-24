// Texte en deux langues : les deux versions sont dans le HTML, le CSS (globals.css) n'affiche que celle de la langue choisie
// (`<html lang>`, posé par le script de layout.tsx avant l'affichage). Fonctionne sans cookie côté serveur, donc les pages restent statiques.
export default function L({ fr, en }: { fr: React.ReactNode; en: React.ReactNode }) {
  return (
    <>
      <span className="l-fr">{fr}</span>
      <span className="l-en" lang="en">
        {en}
      </span>
    </>
  );
}
