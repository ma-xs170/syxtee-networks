import { creditFor } from "@/lib/credits";

// Micro-légende « Photo : auteur — licence » sous une image tierce.
export default function PhotoCredit({ file, label = "Photo" }: { file: string; label?: string }) {
  const c = creditFor(file);
  if (!c) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      {label} : {c.author} —{" "}
      <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline underline-offset-2 hover:text-foreground">
        {c.license}
      </a>
    </p>
  );
}
