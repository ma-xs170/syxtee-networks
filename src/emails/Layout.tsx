import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

// Mise en page commune des emails SYXTEE : même charte que le site (gris doux et non noir pur, un seul rouge d'accent,
// logo S, libellé mono, titre avec mot-clé surligné en rouge, bouton pilule rouge). Styles en ligne (Gmail, Apple Mail, Outlook).
// Valeurs reprises de globals.css (mode Sombre) : --background, --surface, --foreground, --muted, --line, --accent, --on-accent.
// Lisible sans images (texte « SYXTEE NETWORKS » à côté du logo) et en mode clair forcé (contrastes francs).

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const C = { bg: "#15171c", card: "#1b1e24", line: "#2a2d33", fg: "#f2f3f5", muted: "#9aa0ab", accent: "#d92d2d", onAccent: "#ffffff" };

export const p = { color: C.fg, fontFamily: SANS, fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" } as const;
export const muted = { ...p, color: C.muted, fontSize: "13px", lineHeight: "20px" } as const;
export const mono = { fontFamily: MONO } as const;

export function Title({ lead, hl }: { lead: string; hl: string }) {
  return (
    <Text style={{ color: C.fg, fontFamily: SANS, fontSize: "28px", lineHeight: "38px", fontWeight: 600, letterSpacing: "-0.5px", margin: "0 0 20px" }}>
      {lead}{" "}
      <span style={{ backgroundColor: C.accent, color: C.onAccent, borderRadius: "2px", padding: "0 5px" }}>{hl}</span>
    </Text>
  );
}

export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={{ backgroundColor: C.accent, color: C.onAccent, borderRadius: "999px", fontFamily: SANS, fontSize: "15px", fontWeight: 600, padding: "14px 28px", textDecoration: "none", whiteSpace: "nowrap" }}
      >
        {children}
      </Button>
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

export default function Layout({ preview, kicker, reason, children }: { preview: string; kicker: string; reason: string; children: ReactNode }) {
  return (
    <Html lang="fr">
      <Head>
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: C.bg, margin: 0, padding: "32px 12px" }}>
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Section style={{ padding: "0 4px 20px" }}>
            <table role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
                    <Img src={`${site.url}/logo-400.png`} width={18} height={25} alt="S" style={{ display: "block" }} />
                  </td>
                  <td style={{ verticalAlign: "middle", color: C.fg, fontFamily: SANS, fontSize: "13px", fontWeight: 700, letterSpacing: "3px" }}>
                    SYXTEE <span style={{ color: C.muted, fontWeight: 400 }}>NETWORKS</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderTop: `3px solid ${C.accent}`, borderRadius: "16px", padding: "32px 28px 12px", backgroundImage: "radial-gradient(ellipse 80% 120px at 20% 0%, rgba(217,45,45,0.16), rgba(217,45,45,0))", backgroundRepeat: "no-repeat" }}>
            <Text style={{ ...mono, color: C.muted, fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 14px" }}>{kicker}</Text>
            {children}
          </Section>
          <Section style={{ padding: "20px 4px 0" }}>
            <Text style={{ ...muted, fontSize: "12px", lineHeight: "18px", margin: "0 0 8px" }}>
              SYXTEE NETWORKS · Support uniquement sur{" "}
              <Link href={site.discord} style={{ color: C.fg, textDecoration: "underline" }}>
                Discord
              </Link>
            </Text>
            <Hr style={{ borderColor: C.line, margin: "8px 0" }} />
            <Text style={{ ...muted, fontSize: "12px", lineHeight: "18px", margin: 0 }}>{reason}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
