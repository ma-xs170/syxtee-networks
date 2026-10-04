import { Text } from "@react-email/components";
import type { ReactElement } from "react";
import { site } from "@/lib/site";
import Layout, { Callout, Cta, InfoPanel, mono, p, Title } from "./Layout";

// Tous les emails SYXTEE. Chaque modèle renvoie le sujet et le composant ; send.ts produit le HTML et le texte brut.

export type Email = { subject: string; element: ReactElement };

const when = (d: Date) =>
  d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).replace(":", " h ");
const day = (d: Date) => d.toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

const Hi = ({ name }: { name?: string | null }) => <Text style={p}>{name ? `Salut ${name},` : "Salut,"}</Text>;

/** a) Vérification de l'adresse (inscription). */
export function verifyEmail(o: { url: string; firstName?: string | null }): Email {
  return {
    subject: "Confirme ton email SYXTEE",
    element: (
      <Layout preview="Un clic pour activer ton compte." reason="Pas toi ? Ignore cet email.">
        <Title lead="Confirme ton" hl="email." />
        <Hi name={o.firstName} />
        <Cta href={o.url}>Vérifier mon compte</Cta>
      </Layout>
    ),
  };
}

/** Accès approuvé (demande d'accès) : le bouton mène à la création du compte, qui reçoit la formule Partenaire. */
export function accessApproved(o: { firstName?: string | null; email: string }): Email {
  const url = `${site.url}/inscription?email=${encodeURIComponent(o.email)}`;
  return {
    subject: "Ta demande est approuvée : bienvenue chez SYXTEE NETWORKS",
    element: (
      <Layout preview="Ta demande d'accès est approuvée." reason="Tu as demandé l'accès avec cette adresse.">
        <Title lead="Tu as été" hl="approuvé." />
        <Hi name={o.firstName} />
        <Text style={p}>Crée ton compte avec cette adresse pour activer ton accès.</Text>
        <Cta href={url}>Créer mon compte</Cta>
      </Layout>
    ),
  };
}

/** Prévient l'équipe d'une nouvelle demande d'accès (détail complet dans l'admin). */
export function accessRequested(o: { name: string; email: string; channel: string; platform: string; audience: string; devices: string; message: string; adminUrl: string }): Email {
  const rows: [string, string][] = [
    ["Nom", o.name],
    ["Email", o.email],
    ["Chaîne", `${o.channel} (${o.platform})`],
  ];
  return {
    subject: `Demande d'accès : ${o.name}`,
    element: (
      <Layout preview={`${o.name} demande l'accès.`} reason="Email réservé aux administrateurs.">
        <Title lead="Nouvelle" hl="demande." />
        <InfoPanel rows={rows} />
        <Cta href={o.adminUrl}>Traiter la demande</Cta>
      </Layout>
    ),
  };
}

/** b) Bienvenue, après la vérification. */
export function welcome(o: { firstName?: string | null; lastName?: string | null }): Email {
  const full = [o.firstName, o.lastName].filter(Boolean).join(" ");
  return {
    subject: full ? `Bienvenue ${full} sur SYXTEE NETWORKS` : "Bienvenue sur SYXTEE NETWORKS",
    element: (
      <Layout preview="Ton compte est actif." reason="Tu viens d'activer ton compte.">
        <Title lead="Bienvenue" hl={full ? `${full}.` : "sur SYXTEE."} />
        <Text style={p}>Ton compte est actif.</Text>
        <Cta href={`${site.url}/dashboard`}>Ouvrir mon dashboard</Cta>
      </Layout>
    ),
  };
}

/** c) Mot de passe oublié. */
export function resetPassword(o: { url: string }): Email {
  return {
    subject: "Choisis un nouveau mot de passe SYXTEE",
    element: (
      <Layout preview="Lien valable 1 h." reason="Pas toi ? Ignore cet email, ton mot de passe reste valable.">
        <Title lead="Nouveau" hl="mot de passe." />
        <Text style={p}>Ce lien est valable 1 h.</Text>
        <Cta href={o.url}>Choisir un mot de passe</Cta>
      </Layout>
    ),
  };
}

/** d) Alerte : mot de passe modifié. */
export function passwordChanged(o: { at: Date }): Email {
  return {
    subject: "Ton mot de passe SYXTEE a été modifié",
    element: (
      <Layout preview={`Mot de passe modifié le ${when(o.at)}.`} reason="Alerte de sécurité.">
        <Title lead="Mot de passe" hl="modifié." />
        <InfoPanel rows={[["Date et heure", when(o.at)]]} />
        <Callout title="Ce n'était pas toi ?">Choisis un nouveau mot de passe tout de suite.</Callout>
        <Cta href={`${site.url}/mot-de-passe-oublie`}>Sécuriser mon compte</Cta>
      </Layout>
    ),
  };
}

/** e) Connexion depuis un nouvel appareil. */
export function newDevice(o: { device: string; place: string | null; at: Date }): Email {
  return {
    subject: "Nouvelle connexion à ton compte SYXTEE",
    element: (
      <Layout preview={`Connexion depuis ${o.device}.`} reason="Alerte de sécurité.">
        <Title lead="Nouvelle" hl="connexion." />
        <InfoPanel rows={[["Date et heure", when(o.at)], ["Appareil", o.device], ["Lieu", o.place ?? "inconnu"]]} />
        <Callout title="Ce n'était pas toi ?">Change ton mot de passe tout de suite.</Callout>
        <Cta href={`${site.url}/mot-de-passe-oublie`}>Sécuriser mon compte</Cta>
      </Layout>
    ),
  };
}

/** f) Changement d'email : un envoi à l'ancienne adresse, un autre à la nouvelle (les deux liens sont nécessaires). */
export function emailChange(o: { to: "old" | "new"; oldEmail: string; newEmail: string; url: string }): Email {
  const old = o.to === "old";
  return {
    subject: old ? "Changement d'email de ton compte SYXTEE" : "Confirme ta nouvelle adresse SYXTEE",
    element: (
      <Layout preview="Confirme le changement d'adresse." reason={old ? "Pas toi ? Ne clique pas et change ton mot de passe." : "Lien valable 24 h."}>
        <Title lead={old ? "Changement" : "Nouvelle"} hl={old ? "d'email." : "adresse."} />
        <InfoPanel rows={[["Ancienne adresse", o.oldEmail], ["Nouvelle adresse", o.newEmail]]} />
        <Cta href={o.url}>Confirmer</Cta>
      </Layout>
    ),
  };
}

const PLAN: Record<string, string> = { free: "Gratuit", basic: "Basique", paid: "Premium", extra: "Extra", partner: "Partenaire", beta: "Bêta" };

/** g) Formule attribuée ou modifiée, et rappel à J-7 de l'expiration. */
export function planChanged(o: { plan: string; until?: Date | null; expiring?: boolean }): Email {
  const name = PLAN[o.plan] ?? o.plan;
  return {
    subject: o.expiring ? `Ta formule ${name} se termine dans 7 jours` : `Ton compte passe en formule ${name}`,
    element: (
      <Layout preview={o.expiring ? `Fin de la formule ${name}.` : `Formule ${name} active.`} reason="Changement de formule.">
        <Title lead={o.expiring ? "Fin de formule" : "Formule"} hl={o.expiring ? "dans 7 jours." : `${name}.`} />
        {o.until && <Text style={p}>{o.expiring ? "Fin le" : "Jusqu'au"} {day(o.until)}.</Text>}
        <Cta href={`${site.url}/dashboard/abonnement`}>Voir ma formule</Cta>
      </Layout>
    ),
  };
}

/** h) Programme Scan : 1 mois de relais gagné. */
export function freeMonth(o: { until: Date }): Email {
  return {
    subject: "Tu as gagné 1 mois de SYXTEE RELAIS",
    element: (
      <Layout preview={`Relais offert jusqu'au ${day(o.until)}.`} reason="Merci pour tes mesures.">
        <Title lead="1 mois de relais" hl="offert." />
        <Text style={p}>Jusqu&apos;au {day(o.until)}.</Text>
        <Cta href={`${site.url}/dashboard/relais`}>Ouvrir mes relais</Cta>
      </Layout>
    ),
  };
}

/** i) Abonnement : prélèvement refusé (Stripe réessaie ; l'accès continue jusqu'à l'échéance). */
export function paymentFailed(o: { amount: number; currency: string }): Email {
  const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency.toUpperCase() }).format(o.amount / 100);
  return {
    subject: "Ton paiement SYXTEE n'est pas passé",
    element: (
      <Layout preview={`Le prélèvement de ${amount} a été refusé.`} reason="On réessaie automatiquement.">
        <Title lead="Paiement" hl="refusé." />
        <InfoPanel rows={[["Montant", amount]]} />
        <Cta href={`${site.url}/dashboard/abonnement`}>Mettre à jour ma carte</Cta>
      </Layout>
    ),
  };
}

/** Lien de connexion (anciens liens magiques, invitations) : seulement si Supabase en envoie un. */
export function loginLink(o: { url: string }): Email {
  return {
    subject: "Ton lien de connexion SYXTEE",
    element: (
      <Layout preview="Lien de connexion." reason="Pas toi ? Ignore cet email.">
        <Title lead="Connexion à" hl="SYXTEE." />
        <Cta href={o.url}>Me connecter</Cta>
      </Layout>
    ),
  };
}

/** Code de vérification (réauthentification), si Supabase en demande un. */
export function code(o: { token: string }): Email {
  return {
    subject: `Ton code SYXTEE : ${o.token}`,
    element: (
      <Layout preview={`Code : ${o.token}`} reason="Ne le donne à personne.">
        <Title lead="Ton" hl="code." />
        <Text style={{ ...p, ...mono, fontSize: "28px", letterSpacing: "6px", lineHeight: "36px" }}>{o.token}</Text>
      </Layout>
    ),
  };
}

/** Exemples pour /dev/emails (aperçu de chaque modèle). */
export function samples(): { key: string; label: string; email: Email }[] {
  const url = `${site.url}/auth/confirm?token_hash=exemple&type=signup`;
  const now = new Date();
  const in30 = new Date(Date.now() + 30 * 86400_000);
  return [
    { key: "a", label: "a) Vérifie ton adresse", email: verifyEmail({ url, firstName: "Mathis" }) },
    { key: "b", label: "b) Bienvenue", email: welcome({ firstName: "Mathis" }) },
    { key: "c", label: "c) Mot de passe oublié", email: resetPassword({ url }) },
    { key: "d", label: "d) Mot de passe modifié", email: passwordChanged({ at: now }) },
    { key: "e", label: "e) Nouvel appareil", email: newDevice({ device: "Chrome sur macOS", place: "Paris, FR", at: now }) },
    { key: "f1", label: "f) Changement d'email (ancienne)", email: emailChange({ to: "old", oldEmail: "ancien@exemple.com", newEmail: "nouveau@exemple.com", url }) },
    { key: "f2", label: "f) Changement d'email (nouvelle)", email: emailChange({ to: "new", oldEmail: "ancien@exemple.com", newEmail: "nouveau@exemple.com", url }) },
    { key: "g1", label: "g) Formule attribuée", email: planChanged({ plan: "partner", until: in30 }) },
    { key: "g2", label: "g) Formule : J-7", email: planChanged({ plan: "partner", until: in30, expiring: true }) },
    { key: "h", label: "h) 1 mois gagné", email: freeMonth({ until: in30 }) },
    { key: "i", label: "i) Paiement refusé", email: paymentFailed({ amount: 999, currency: "eur" }) },
  ];
}
