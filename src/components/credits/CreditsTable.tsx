import type { Credit } from "@/lib/credits";

const link = "underline underline-offset-2 hover:text-foreground";

// Tableau discret des crédits. Défile horizontalement dans son cadre sur mobile, sans élargir la page.
export default function CreditsTable({ items }: { items: Credit[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-y border-line text-left text-xs text-muted">
        <thead>
          <tr className="border-b border-line font-mono uppercase tracking-[0.1em]">
            <th scope="col" className="py-3 pr-4 font-normal">Image</th>
            <th scope="col" className="py-3 pr-4 font-normal">Titre</th>
            <th scope="col" className="py-3 pr-4 font-normal">Auteur</th>
            <th scope="col" className="py-3 pr-4 font-normal">Licence</th>
            <th scope="col" className="py-3 font-normal">Modifications</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {items.map((c) => (
            <tr key={c.file} className="align-top">
              <td className="py-3 pr-4 font-mono">{c.file}</td>
              <td className="py-3 pr-4">
                <a href={c.source} target="_blank" rel="noopener noreferrer" className={link}>{c.title}</a>
              </td>
              <td className="py-3 pr-4">{c.author}</td>
              <td className="py-3 pr-4">
                <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className={link}>{c.license}</a>
              </td>
              <td className="py-3">{c.changes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
