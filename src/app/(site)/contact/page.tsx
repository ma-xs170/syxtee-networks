import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/contact/ContactForm";
import { Container } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contacter",
  description: "Demande un devis gratuit pour ton live IRL en mobilité : marathon, manifestation publique, festival, reportage. Décris ton projet, on revient vers toi.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-line py-16 sm:py-24">
        <Container className="max-w-5xl">
          <h1 className="h-serif max-w-[16ch] text-[clamp(3rem,7vw,5rem)]">Parle-nous de ton <em>projet.</em></h1>
          <p className="mt-6 max-w-[56ch] text-base leading-relaxed text-muted sm:text-lg">
            Tu prépares un live IRL en mobilité ? Décris ton besoin, on revient vers toi avec un devis gratuit et personnalisé.
          </p>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container className="grid max-w-5xl gap-10 lg:grid-cols-[1fr_340px]">
          <ContactForm />
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-line bg-surface p-6">
              <p className="font-semibold">Devis gratuit</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">Marathon, manifestation publique, festival, reportage… Décris ton projet et reçois une estimation personnalisée, sans engagement.</p>
            </div>
            <p className="px-1 text-sm text-muted">
              Un souci avec ton compte ? <Link href="/dashboard/support" className="text-foreground underline underline-offset-4">Assistance</Link>, ou la <Link href="/faq" className="text-foreground underline underline-offset-4">FAQ</Link>.
            </p>
          </aside>
        </Container>
      </section>
    </>
  );
}
