import type { Metadata } from "next";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getProfile, requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Paramètres : intégrations", robots: { index: false } };

// Destinations de stream : seulement YouTube, Twitch et Kick. « Connecté » = un compte est renseigné dans le profil.
export default async function IntegrationsPage() {
  const [, profile] = await Promise.all([requireUser("/dashboard/parametres/integrations"), getProfile()]);
  const twitch = profile?.twitch_login || profile?.twitch_display_name || profile?.twitch;
  const items = [
    { name: "YouTube", value: profile?.youtube, text: "Diffuse ton direct sur ta chaîne YouTube." },
    { name: "Twitch", value: twitch, text: "Compte lié, affiché sur l'accueil du site si tu l'as choisi." },
    { name: "Kick", value: profile?.kick, text: "Diffuse ton direct sur ta chaîne Kick." },
  ];
  return (
    <>
      {items.map((it) => (
        <Card key={it.name} title={it.name} right={it.value ? <Badge tone="ok">Connecté</Badge> : <Badge>Non connecté</Badge>}>
          <p className="text-sm text-muted">{it.value ? `Compte : ${it.value}. ` : ""}{it.text}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/dashboard/profil" variant="secondary">Gérer dans le profil</ButtonLink>
            <ButtonLink href="/dashboard/controle-a-distance" variant="ghost">Destinations de stream</ButtonLink>
          </div>
        </Card>
      ))}
    </>
  );
}
