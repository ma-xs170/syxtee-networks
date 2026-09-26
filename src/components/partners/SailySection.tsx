import type { ReactNode } from "react";
import PhoneAndroid from "@/components/illustrations/PhoneAndroid";
import PhoneMoblin from "@/components/illustrations/PhoneMoblin";
import PocketRouter from "@/components/illustrations/PocketRouter";
import { Container, SectionHeader } from "@/components/ui";
import Highlight from "@/components/ui/Highlight";
import { partners } from "@/lib/site";
import PromoCode from "./PromoCode";
import { PartnerNote, SailyLink, SailyLogo, sailyLinkProps } from "./Saily";

// Section « 4G en plus avec Saily » (page /moblin, ancre #saily).
// Un iPhone n'utilise qu'une ligne de données à la fois : l'eSIM Saily va sur un 2e appareil
// (Android avec Moblink, ou routeur 4G), qui s'ajoute au bonding de Moblin.

const linkClass = "text-foreground underline underline-offset-4";

const cards = [
  { t: "eSIM en quelques minutes", d: "Achat et installation depuis l'app, sans carte physique." },
  { t: "Data uniquement", d: "Parfait pour un appareil dédié au bonding." },
  { t: "Utilisable dans de nombreux pays", d: "Pratique pour streamer en voyage." },
];

function Step({ n, title, visual, children }: { n: string; title: string; visual: ReactNode; children?: ReactNode }) {
  return (
    <li className="grid items-center gap-8 border-b border-line py-10 last:border-b-0 md:grid-cols-[1fr_260px] md:gap-16">
      <div className="min-w-0">
        <p className="font-mono text-sm text-muted">{n}</p>
        <h4 className="mt-3 text-xl font-semibold tracking-tight">{title}</h4>
        {children && <div className="mt-3 space-y-3 text-base leading-relaxed text-muted">{children}</div>}
      </div>
      <div className="mx-auto h-52 w-full max-w-[260px]">{visual}</div>
    </li>
  );
}

function Box({ kicker, children, art }: { kicker: string; children: ReactNode; art?: ReactNode }) {
  return (
    <div className="grid items-center gap-6 rounded-2xl border border-line bg-white/[0.02] p-6 sm:grid-cols-[1fr_auto] sm:p-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{kicker}</p>
        <div className="mt-3 text-base leading-relaxed">{children}</div>
      </div>
      {art && <div className="mx-auto h-36 w-44">{art}</div>}
    </div>
  );
}

/** header : "full" (titre surligné, intro, logo) ou "compact" (sur /saily, après le ScrollStory). */
export default function SailySection({ header = "full" }: { header?: "full" | "compact" }) {
  return (
    <section id="saily" className="scroll-mt-20 overflow-x-clip border-b border-line py-20 sm:py-24">
      <Container>
        {header === "full" ? (
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <SectionHeader
              kicker="4G en plus avec Saily"
              title={
                <>
                  Une 4G de plus, <Highlight>en quelques minutes.</Highlight>
                </>
              }
            >
              Ton iPhone n&apos;utilise qu&apos;une ligne de données à la fois. Pour ajouter une 4G au bonding, on installe une
              eSIM {partners.saily.name} sur un 2e appareil, qui rejoint Moblin via l&apos;app Moblink.
            </SectionHeader>
            <a {...sailyLinkProps} aria-label={`${partners.saily.name} (lien partenaire)`} className="shrink-0 opacity-90 transition-opacity hover:opacity-100">
              <SailyLogo className="h-14 w-auto" />
            </a>
          </div>
        ) : (
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <SectionHeader kicker="Mode d'emploi" title="Tout pour installer ta 2e 4G." />
            <SailyLogo className="h-12 w-auto opacity-90" />
          </div>
        )}

        {/* a) Les 3 atouts */}
        <div className={`grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 mt-14`}>
          {cards.map((c) => (
            <article key={c.t} className="bg-black p-8">
              <h3 className="text-base font-semibold">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <SailyLink code={false} />
          <PromoCode />
        </div>

        {/* b) Tutoriel */}
        <h3 className="mt-20 font-mono text-xs uppercase tracking-[0.2em] text-muted">Installer une 2e 4G en 5 étapes</h3>
        <ol className="mt-4">
          <Step n="01" title="Vérifie que ton 2e téléphone est compatible eSIM" visual={<PhoneAndroid screen="esim" />}>
            <p>
              La liste officielle est sur{" "}
              <a href={partners.saily.devicesUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                saily.com
              </a>
              . Un vieux téléphone Android récent suffit : il ne sert qu&apos;à la connexion.
            </p>
          </Step>
          <Step n="02" title="Installe l'app Saily et choisis un forfait pour ta destination" visual={<PhoneAndroid screen="plan" />}>
            <p>
              Les forfaits et les prix changent : consulte-les directement sur le{" "}
              <a {...sailyLinkProps} className={linkClass}>
                site {partners.saily.name}
              </a>
              .
            </p>
            <PartnerNote />
          </Step>
          <Step n="03" title="Active l'eSIM et les données mobiles sur ce téléphone" visual={<PhoneAndroid screen="data" />}>
            <p>Dans les réglages réseau d&apos;Android, choisis l&apos;eSIM pour les données mobiles et vérifie que la 4G capte.</p>
          </Step>
          <Step
            n="04"
            title="Installe Moblink (Android) et connecte les 2 téléphones au même réseau"
            visual={
              <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center">
                <PhoneMoblin waves={false} className="h-full w-full" />
                <div className="flex w-16 flex-col items-center gap-2" aria-hidden="true">
                  <div className="w-full border-t border-dashed border-white/60" />
                  <p className="text-center font-mono text-[9px] uppercase leading-tight tracking-[0.12em] text-muted">
                    Réseau
                    <br />
                    local
                  </p>
                </div>
                <PhoneAndroid className="h-full w-full" />
              </div>
            }
          >
            <p>Le plus simple : active le partage de connexion de l&apos;iPhone et connecte le téléphone Android dessus. Un même Wi-Fi marche aussi.</p>
          </Step>
          <Step n="05" title="Dans Moblin → Réglages → Moblink : même mot de passe des deux côtés" visual={<PhoneAndroid screen="moblink" waves />}>
            <p>
              Moblink affiche <strong className="font-medium text-foreground">« Connected to streamer »</strong> : la 4G du 2e
              téléphone apparaît dans le bonding de Moblin, à côté de celle de l&apos;iPhone.
            </p>
          </Step>
        </ol>

        {/* c) et d) Encadrés */}
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          <Box kicker="Variante" art={<PocketRouter />}>
            <p>
              Pas de 2e téléphone Android ? Un routeur 4G de poche avec l&apos;eSIM ou la SIM, connecté en Wi-Fi à l&apos;iPhone,
              marche aussi.
            </p>
          </Box>
          <Box kicker="À vérifier">
            <p>
              Consulte les conditions du forfait {partners.saily.name} (volume de data, pays couverts, partage de connexion
              autorisé) avant ton live.
            </p>
            <div className="mt-6">
              <SailyLink variant="ghost" />
            </div>
          </Box>
        </div>
      </Container>
    </section>
  );
}
