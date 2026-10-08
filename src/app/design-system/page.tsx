import type { Metadata } from "next";
import { DeviceIpad, DeviceIphone, DeviceMac } from "@/components/devices/Devices";
import Glow from "@/components/landing/Glow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import CodeBlock from "@/components/ui/CodeBlock";
import Counter from "@/components/ui/Counter";
import EmptyState from "@/components/ui/EmptyState";
import GlassIcon, { type GlassName } from "@/components/ui/GlassIcon";
import GridBackground from "@/components/ui/GridBackground";
import Marquee from "@/components/ui/Marquee";
import SectionHeader from "@/components/ui/SectionHeader";
import { Bars, Sparkline } from "@/components/ui/Sparkline";
import StatusPill from "@/components/ui/StatusPill";
import Tabs from "@/components/ui/Tabs";
import WordsReveal from "@/components/ui/WordsReveal";
import { Cpu } from "@/components/icons";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

const ICONS: GlassName[] = ["obs-cloud", "relay", "encoder", "shared", "health", "map", "docs", "community"];
const COLORS: [string, string, string][] = [
  ["Fond", "#000000", "var(--background)"],
  ["Surface", "#0A0A0B", "var(--surface)"],
  ["Surface 2", "#111113", "var(--surface-2)"],
  ["Texte", "#FAFAFA", "var(--foreground)"],
  ["Secondaire", "#8A8F98", "var(--muted)"],
  ["Tertiaire", "#5B5F66", "var(--faint)"],
  ["Statut vert", "#3DD68C", "var(--ok)"],
  ["Orange", "#F5A524", "var(--warn)"],
  ["Rouge", "#F2555A", "var(--bad)"],
];

// Écran d'exemple pour les appareils : l'interface du site en mode sombre, jamais un fond coloré.
function DemoScreen({ w, title }: { w: number; title: string }) {
  const s = w / 1280;
  return (
    <div className="flex h-full w-full flex-col bg-[#0a0a0b] text-white" style={{ padding: 40 * s * 4 }}>
      <p className="font-semibold" style={{ fontSize: 44 * s * 4 }}>{title}</p>
      <div className="mt-[4%] grid flex-1 grid-cols-3 gap-[3%]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[10px] border border-white/10 bg-white/[0.04]" />
        ))}
      </div>
      <div className="mt-[3%] h-[10%] rounded-full bg-white" />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-16">
      <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{title}</p>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <Glow />
      <GridBackground />
      <div className="mx-auto max-w-6xl px-4 pb-32 pt-20 sm:px-6">
        <StatusPill variant="dev" label="DESIGN SYSTEM" />
        <h1 className="h-serif mt-6 text-[clamp(3rem,8vw,5.5rem)]">
          <WordsReveal text="Une direction artistique à valider." em={["valider."]} />
        </h1>
        <p className="mt-5 max-w-[560px] text-muted">Tous les composants de base, avant de refaire la landing. Page privée, non indexée.</p>

        <Block title="Typographie">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="h-serif text-6xl">Aa <em>Aa</em></p>
              <p className="mt-3 font-mono text-xs text-muted">Instrument Serif, titres, 400</p>
            </div>
            <div>
              <p className="text-3xl font-medium tracking-tight">Interface et texte</p>
              <p className="mt-3 font-mono text-xs text-muted">Geist Sans, 14 à 16 px</p>
            </div>
            <div>
              <p className="font-mono text-3xl tabular-nums">8,2 Mb/s 84 ms</p>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.08em] text-muted">Geist Mono, valeurs et labels</p>
            </div>
          </div>
        </Block>

        <Block title="Couleurs">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {COLORS.map(([n, hex, v]) => (
              <div key={n} className="rounded-xl border border-line p-3">
                <span className="block h-12 rounded-lg border border-line" style={{ background: v }} />
                <p className="mt-2 text-sm">{n}</p>
                <p className="font-mono text-xs text-muted">{hex}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block title="Boutons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Demander l&apos;accès</Button>
            <Button variant="secondary">Voir comment ça marche</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Supprimer</Button>
            <Button loading>Chargement</Button>
          </div>
        </Block>

        <Block title="Pastille de statut">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill variant="live" timer="00:14:32" />
            <StatusPill variant="ok" />
            <StatusPill variant="unstable" />
            <StatusPill variant="offline" />
            <StatusPill variant="dev" />
            <Badge>Badge</Badge>
            <Badge tone="ok">Connecté</Badge>
          </div>
        </Block>

        <Block title="Icônes verre 3D">
          <div className="grid grid-cols-4 gap-6 sm:grid-cols-8">
            {ICONS.map((n) => (
              <div key={n} className="flex flex-col items-center gap-3">
                <GlassIcon name={n} size={72} />
                <span className="font-mono text-[11px] text-muted">{n}</span>
              </div>
            ))}
          </div>
        </Block>

        <Block title="En-tête de section">
          <SectionHeader icon="obs-cloud" title={<>Pilote ton OBS <em>à distance</em></>} subtitle="Scènes, audio et démarrage du live, depuis ton navigateur ou ton téléphone." />
          <div className="mt-20">
            <SectionHeader align="left" title="Un relais qui ne lâche pas." subtitle="Plusieurs connexions, un seul flux." link={<a href="#" className="text-muted hover:text-foreground">En savoir plus →</a>} />
          </div>
        </Block>

        <Block title="Cartes, compteurs et graphiques (le halo suit le curseur)">
          <div className="grid gap-4 md:grid-cols-3">
            <Card title="Débit"><p className="text-4xl"><Counter value={8.2} decimals={1} /> <span className="text-sm text-muted">Mb/s</span></p><Sparkline data={[3, 5, 4, 7, 6, 9, 8, 10]} className="mt-4 h-14 w-full" /></Card>
            <Card title="Latence"><p className="text-4xl"><Counter value={84} suffix=" ms" /></p><Bars data={[4, 6, 5, 8, 7, 9]} className="mt-4 h-14" /></Card>
            <Card title="Connexions"><p className="text-4xl"><Counter value={4} suffix=" / 4" /></p><p className="mt-4 text-sm text-muted">Toutes bondées.</p></Card>
          </div>
        </Block>

        <Block title="Bloc de code (onglets, saisie au scroll, copier)">
          <CodeBlock typewriter tabs={[{ label: "Relais SRTLA", code: "URL : srtla://relais.syxtee-networks.fr:PORT\nIdentifiant de flux : TON_ID" }, { label: "RTMP", code: "Serveur : rtmp://relais.syxtee-networks.fr/live\nClé de stream : TA_CLE" }]} />
        </Block>

        <Block title="Onglets">
          <Tabs tabs={[{ id: "a", label: "Aperçu", content: <p className="text-muted">Contenu de l&apos;onglet Aperçu.</p> }, { id: "b", label: "Usage", content: <p className="text-muted">Contenu de l&apos;onglet Usage.</p> }, { id: "c", label: "Équipe", content: <p className="text-muted">Contenu de l&apos;onglet Équipe.</p> }]} />
        </Block>

        <Block title="Marquee (gris, fondu aux bords)">
          <Marquee items={["Relais SRTLA", "Contrôle à distance", "Bonding", "Mire de coupure", "Espaces partagés", "Santé du flux"].map((t) => <span key={t} className="text-xl font-medium">{t}</span>)} />
        </Block>

        <Block title="État vide">
          <Card><EmptyState icon={<Cpu weight="light" />} title="Aucun appareil pour l'instant" text="Lie un appareil pour le voir apparaître ici." action={<Button>Lier un appareil</Button>} /></Card>
        </Block>

        <Block title="Appareils (coloris noir, écran interactif en HTML)">
          <div className="relative mx-auto max-w-4xl pb-16">
            <div className="mx-auto w-[78%]"><DeviceMac><DemoScreen w={1280} title="Contrôle à distance" /></DeviceMac></div>
            <div className="absolute bottom-0 right-[3%] w-[20%]"><DeviceIphone className="device-float"><DemoScreen w={390} title="Contrôle à distance" /></DeviceIphone></div>
          </div>
          <div className="mx-auto mt-16 max-w-2xl"><DeviceIpad><DemoScreen w={1180} title="Espaces partagés" /></DeviceIpad></div>
        </Block>
      </div>
    </main>
  );
}
