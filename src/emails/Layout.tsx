import { Body, Button, Container, Head, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

// Mise en page commune des emails SYXTEE : même charte que le site (gris doux et non noir pur, un seul rouge d'accent,
// logo S, libellé mono, titre avec mot-clé surligné en rouge, bouton pilule rouge). Styles en ligne (Gmail, Apple Mail, Outlook).
// Valeurs reprises de globals.css (mode Sombre) : --background, --surface, --foreground, --muted, --line, --accent, --on-accent.
// Lisible sans images (texte « SYXTEE NETWORKS » à côté du logo) et en mode clair forcé (contrastes francs).

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const C = { bg: "#15171c", card: "#1b1e24", line: "#2a2d33", fg: "#f2f3f5", muted: "#9aa0ab", accent: "#d92d2d", onAccent: "#ffffff" };

export const p = { color: C.fg, fontFamily: SANS, fontSize: "15px", lineHeight: "24px", margin: "0 0 16px", textAlign: "center" } as const;
export const muted = { ...p, color: C.muted, fontSize: "13px", lineHeight: "20px" } as const;
const left = { textAlign: "left" } as const;
export const mono = { fontFamily: MONO } as const;

export function Title({ lead, hl }: { lead: string; hl: string }) {
  return (
    <Text style={{ color: C.fg, fontFamily: SANS, fontSize: "28px", lineHeight: "38px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 20px", textAlign: "center" }}>
      {lead}{" "}
      <span style={{ backgroundColor: C.accent, color: C.onAccent, borderRadius: "2px", padding: "0 5px" }}>{hl}</span>
    </Text>
  );
}

export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 24px", textAlign: "center" }}>
      <Button
        href={href}
        style={{ backgroundColor: C.accent, color: C.onAccent, borderRadius: "999px", fontFamily: SANS, fontSize: "15px", fontWeight: 600, padding: "14px 28px", textDecoration: "none", whiteSpace: "nowrap" }}
      >
        {children}
      </Button>
    </Section>
  );
}

/** Encadré d'informations (libellé gris, valeur claire, filet entre les lignes), comme l'encadré « Date et heure / Appareil / Adresse IP ». */
export function InfoPanel({ rows }: { rows: [string, string][] }) {
  return (
    <Section style={{ backgroundColor: C.bg, border: `1px solid ${C.line}`, borderRadius: "12px", padding: "6px 20px", margin: "0 0 20px" }}>
      {rows.map(([k, v], i) => (
        <div key={k} style={{ padding: "14px 0", borderTop: i ? `1px solid ${C.line}` : "none", ...left }}>
          <Text style={{ ...muted, ...left, margin: "0 0 2px", fontSize: "12px" }}>{k}</Text>
          <Text style={{ ...p, ...left, margin: 0, fontWeight: 600 }}>{v}</Text>
        </div>
      ))}
    </Section>
  );
}

/** Encadré d'alerte (« Ce n'était pas vous ? »), teinté d'accent rouge. */
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Section style={{ backgroundColor: "#2a1a1d", border: "1px solid #5a2327", borderRadius: "12px", padding: "16px 20px", margin: "0 0 24px" }}>
      <Text style={{ ...p, ...left, margin: "0 0 4px", fontWeight: 700, color: "#ff8a85" }}>{title}</Text>
      <Text style={{ ...p, ...left, margin: 0, fontSize: "14px", lineHeight: "22px", color: "#f0d6d4" }}>{children}</Text>
    </Section>
  );
}

/** Lien en clair sous le bouton (clients qui bloquent les boutons, copier-coller). */
export function RawLink({ href }: { href: string }) {
  return (
    <Text style={{ ...muted, wordBreak: "break-all" }}>
      Le bouton ne marche pas ? Copie ce lien dans ton navigateur :<br />
      <Link href={href} style={{ color: C.fg, textDecoration: "underline" }}>
        {href}
      </Link>
    </Text>
  );
}

// `kicker` ne s'affiche plus (titre centré seul, comme les emails de référence) ; gardé pour l'aperçu et les modèles.
export default function Layout({ preview, reason, children }: { preview: string; kicker?: string; reason: string; children: ReactNode }) {
  return (
    <Html lang="fr">
      <Head>
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: C.bg, margin: 0, padding: "32px 12px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Section style={{ padding: "8px 0 28px", textAlign: "center" }}>
            <Img src={`${site.url}/logo-400.png`} width={34} height={47} alt="SYXTEE NETWORKS" style={{ display: "block", margin: "0 auto" }} />
          </Section>
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.accent}`, borderRadius: "16px", padding: "36px 28px 16px", backgroundImage: "radial-gradient(ellipse 80% 120px at 20% 0%, rgba(217,45,45,0.16), rgba(217,45,45,0))", backgroundRepeat: "no-repeat" }}>
            {children}
          </Section>
          <Section style={{ padding: "24px 4px 0", textAlign: "center" }}>
            <Text style={{ ...muted, fontStyle: "italic", fontSize: "13px", margin: "0 0 14px" }}>Ceci est un email automatique, merci de ne pas y répondre.</Text>
            <Text style={{ ...muted, fontSize: "12px", lineHeight: "18px", margin: "0 0 14px" }}>{reason}</Text>
            <Text style={{ ...muted, color: C.fg, margin: "0 0 4px" }}>Cet email a été envoyé par SYXTEE NETWORKS</Text>
            <Text style={{ ...muted, fontSize: "12px", margin: "0 0 18px" }}>© {new Date().getFullYear()} SYXTEE NETWORKS. Tous droits réservés.</Text>
            <Text style={{ ...muted, fontSize: "13px", margin: 0 }}>
              <Link href={site.discord} style={{ color: C.fg, textDecoration: "none" }}>
                Contact
              </Link>
              <span style={{ color: C.line }}> &nbsp;|&nbsp; </span>
              <Link href={`${site.url}/confidentialite`} style={{ color: C.fg, textDecoration: "none" }}>
                Confidentialité
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
