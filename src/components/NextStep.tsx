import Link from "next/link";
import { Container } from "./ui";

export default function NextStep({ label, href }: { label: string; href: string }) {
  return (
    <section className="py-16">
      <Container>
        <div className="flex flex-col gap-6 rounded-2xl border border-line p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
          <Link href={href} className="group">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Étape suivante</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {label} <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </p>
          </Link>
          <Link href="/dashboard/support" className="btn btn-secondary">Une question ? Écris-nous</Link>
        </div>
      </Container>
    </section>
  );
}
