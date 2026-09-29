import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { site } from "@/lib/site";

// Mise en page commune des emails SYXTEE : DA du site (fond noir, carte #0a0a0a, bordure fine, logo S, kicker mono,
// titre avec surlignage blanc, bouton blanc texte noir). Styles en ligne (Gmail, Apple Mail, Outlook).
// Lisible sans images (texte « SYXTEE NETWORKS » à côté du logo) et en mode clair forcé (contrastes francs).

const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
export const C = { bg: "#000000", card: "#0a0a0a", line: "#1f1f1f", fg: "#f5f5f5", muted: "#8a8a8a" };

export const p = { color: C.fg, fontFamily: SANS, fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" } as const;
export const muted = { ...p, color: C.muted, fontSize: "13px", lineHeight: "20px" } as const;
export const mono = { fontFamily: MONO } as const;

export function Title({ lead, hl }: { lead: string; hl: string }) {
  return (
    <Text style={{ color: C.fg, fontFamily: SANS, fontSize: "26px", lineHeight: "36px", fontWeight: 600, letterSpacing: "-0.4px", margin: "0 0 20px" }}>
      {lead}{" "}
      <span style={{ backgroundColor: "#ffffff", color: "#000000", borderRadius: "2px", padding: "0 5px" }}>{hl}</span>
    </Text>
  );
}

export function Cta({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={{ backgroundColor: "#ffffff", color: "#000000", borderRadius: "12px", fontFamily: SANS, fontSize: "14px", fontWeight: 600, padding: "14px 24px", textDecoration: "none" }}
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
        <Container style={{ maxWidth: "520px", margin: "0 auto" }}>
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
          <Section style={{ backgroundColor: C.card, border: `1px solid ${C.line}`, borderRadius: "16px", padding: "32px 28px 12px" }}>
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
