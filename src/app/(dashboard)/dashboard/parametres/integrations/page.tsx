import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DiscordTicketButton, SupportId } from "@/components/SupportId";
import { getProfile, requireUser } from "@/lib/auth/dal";
import { partners } from "@/lib/site";

export const metadata: Metadata = { title: "Paramètres : intégrations", robots: { index: false } };

export default async function IntegrationsPage() {
  const [, profile] = await Promise.all([requireUser("/dashboard/parametres/integrations"), getProfile()]);
  const twitch = profile?.twitch_login || profile?.twitch_display_name || profile?.twitch;
  return (
    <>
      <Card title="Twitch" right={twitch ? <Badge tone="ok">Lié</Badge> : <Badge>Non lié</Badge>}>
        <p className="text-sm text-muted">{twitch ? `Compte lié : ${twitch}.` : "Lie ton compte pour apparaître sur l'accueil du site."} Les réseaux et l&apos;affichage se règlent dans ton profil.</p>
        <div className="mt-5">
          <ButtonLink href="/dashboard/profil" variant="secondary">Ouvrir le profil</ButtonLink>
        </div>
      </Card>
      <Card title="YouTube">
        <p className="text-sm text-muted">Tes destinations de stream (YouTube, Twitch, Kick…) se règlent dans le multistream de ton contrôle à distance.</p>
        <div className="mt-5">
          <ButtonLink href="/dashboard/controle-a-distance" variant="secondary">Ouvrir le contrôle à distance</ButtonLink>
        </div>
      </Card>
      <Card title="Discord">
        <p className="text-sm text-muted">Le support se fait sur Discord. Donne ton ID de support dans ton ticket : on retrouve ton compte sans te demander ton e-mail.</p>
        {profile?.support_id && (
          <div className="mt-4">
            <SupportId id={profile.support_id} />
          </div>
        )}
        <div className="mt-5">{profile?.support_id ? <DiscordTicketButton id={profile.support_id} /> : <ButtonLink href="https://discord.gg/CD68F8yZuZ" external variant="secondary">Rejoindre le Discord</ButtonLink>}</div>
      </Card>
      <Card title="Saily">
        <p className="text-sm text-muted">Une eSIM de données pour voyager. Code de réduction : <span className="font-mono text-foreground">{partners.saily.code}</span></p>
        <div className="mt-5">
          <ButtonLink href="/saily" variant="secondary">Voir l&apos;offre</ButtonLink>
        </div>
      </Card>
    </>
  );
}
