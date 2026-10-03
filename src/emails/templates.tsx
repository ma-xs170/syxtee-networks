import { Link, Text } from "@react-email/components";
import type { ReactElement } from "react";
import { site } from "@/lib/site";
import Layout, { C, Cta, mono, muted, p, RawLink, Title } from "./Layout";

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
      <Layout preview="Un clic pour activer ton compte SYXTEE." kicker="Vérification" reason="Tu reçois cet email car un compte SYXTEE vient d'être créé avec cette adresse. Pas toi ? Ignore-le : sans clic, aucun compte n'est activé.">
        <Title lead="Confirme ton email," hl="et c'est parti." />
        <Hi name={o.firstName} />
        <Text style={p}>Clique sur le bouton pour activer ton compte. Le lien est valable 24 h.</Text>
        <Cta href={o.url}>Vérifier mon compte</Cta>
        <RawLink href={o.url} />
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
      <Layout preview="Ta demande d'accès est approuvée. Crée ton compte." kicker="Accès approuvé" reason="Tu reçois cet email car tu as demandé l'accès à SYXTEE NETWORKS avec cette adresse.">
        <Title lead="Tu as été" hl="approuvé." />
        <Hi name={o.firstName} />
        <Text style={p}>
          Bonne nouvelle : ta demande d&apos;accès est acceptée. SYXTEE NETWORKS te souhaite la bienvenue. Ton accès partenaire inclut les relais SRTLA, RTMP et RIST, SYXTEE STUDIO et toutes les fonctions.
        </Text>
        <Text style={p}>Clique sur le bouton, crée ton compte avec cette adresse (celle de cet email) et ton accès s&apos;active tout seul.</Text>
        <Cta href={url}>Créer mon compte</Cta>
        <RawLink href={url} />
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
    ["Audience", o.audience || "non précisée"],
    ["Matériel", o.devices || "non précisé"],
  ];
  return {
    subject: `Demande d'accès : ${o.name}`,
    element: (
      <Layout preview={`${o.name} demande l'accès.`} kicker="Admin" reason="Tu reçois cet email car tu es administrateur SYXTEE NETWORKS.">
        <Title lead="Nouvelle demande" hl="d'accès." />
        {rows.map(([k, v]) => (
          <Text key={k} style={{ ...p, margin: "0 0 8px" }}>
            <span style={{ ...mono, color: C.muted, fontSize: "12px" }}>{k}</span>
            <br />
            {v}
          </Text>
        ))}
        {o.message && <Text style={{ ...p, whiteSpace: "pre-wrap", borderLeft: `2px solid ${C.line}`, paddingLeft: "12px" }}>{o.message}</Text>}
        <Cta href={o.adminUrl}>Traiter la demande</Cta>
      </Layout>
    ),
  };
}

/** b) Bienvenue, après la vérification. */
export function welcome(o: { firstName?: string | null; lastName?: string | null }): Email {
  const full = [o.firstName, o.lastName].filter(Boolean).join(" ");
  const steps: [string, string, string][] = [
    ["Demande ton accès", "Relais SRTLA, URLs Moblin et OBS, santé du flux : ouvert aux partenaires.", `${site.url}/offres`],
    ["Scanne ton réseau", "L'analyseur mesure ta 4G/5G et alimente la carte de couverture.", `${site.url}/dashboard/analyseur`],
    ["Rejoins le Discord", "Réglages, entraide et support.", site.discord],
  ];
  return {
    subject: full ? `Bienvenue ${full} sur SYXTEE NETWORKS` : "Bienvenue sur SYXTEE NETWORKS",
    element: (
      <Layout preview="Ton compte est actif : les 3 prochaines étapes." kicker="Bienvenue" reason="Tu reçois cet email car tu viens d'activer ton compte SYXTEE.">
        <Title lead="Bienvenue" hl={full ? `${full}.` : "sur SYXTEE."} />
        <Hi name={o.firstName} />
        <Text style={p}>Ton compte SYXTEE NETWORKS est actif. Trois étapes pour ton premier live :</Text>
        {steps.map(([t, d, href], i) => (
          <Text key={t} style={{ ...p, margin: "0 0 14px" }}>
            <span style={{ ...mono, color: C.muted, fontSize: "12px" }}>{i + 1}.</span>{" "}
            <Link href={href} style={{ color: C.fg, fontWeight: 600, textDecoration: "underline" }}>
              {t}
            </Link>
            <br />
            <span style={{ color: C.muted, fontSize: "14px" }}>{d}</span>
          </Text>
        ))}
        <Cta href={`${site.url}/dashboard`}>Ouvrir mon dashboard</Cta>
        <Text style={{ ...p, borderTop: `1px solid ${C.line}`, paddingTop: "18px", margin: "0 0 6px", fontWeight: 600 }}>Besoin d&apos;aide ?</Text>
        <Text style={{ ...muted, margin: "0 0 18px" }}>
          Lis la{" "}
          <Link href={`${site.url}/docs`} style={{ color: C.fg, textDecoration: "underline" }}>
            documentation
          </Link>
          , ou ouvre une demande depuis ton{" "}
          <Link href={`${site.url}/dashboard/support`} style={{ color: C.fg, textDecoration: "underline" }}>
            espace support
          </Link>
          . On te répond là-bas.
        </Text>
      </Layout>
    ),
  };
}

/** c) Mot de passe oublié. */
export function resetPassword(o: { url: string }): Email {
  return {
    subject: "Choisis un nouveau mot de passe SYXTEE",
    element: (
      <Layout preview="Lien valable 1 h pour choisir un nouveau mot de passe." kicker="Mot de passe" reason="Tu reçois cet email car une réinitialisation du mot de passe a été demandée pour ce compte.">
        <Title lead="Nouveau" hl="mot de passe." />
        <Text style={p}>Quelqu&apos;un (toi, normalement) a demandé à changer le mot de passe de ce compte. Le lien est valable 1 h.</Text>
        <Cta href={o.url}>Choisir un nouveau mot de passe</Cta>
        <Text style={p}>Si ce n&apos;est pas toi, ignore cet email : ton mot de passe actuel reste valable.</Text>
        <RawLink href={o.url} />
      </Layout>
    ),
  };
}

/** d) Alerte : mot de passe modifié. */
export function passwordChanged(o: { at: Date }): Email {
  return {
    subject: "Ton mot de passe SYXTEE a été modifié",
    element: (
      <Layout preview={`Mot de passe modifié le ${when(o.at)}.`} kicker="Alerte de sécurité" reason="Tu reçois cet email car le mot de passe de ton compte SYXTEE vient de changer. C'est une alerte de sécurité : on l'envoie toujours.">
        <Title lead="Mot de passe" hl="modifié." />
        <Text style={p}>Le mot de passe de ton compte a été changé le {when(o.at)}.</Text>
        <Text style={p}>C&apos;était toi ? Rien à faire.</Text>
        <Text style={p}>Ce n&apos;était pas toi ? Reprends la main tout de suite, puis ouvre un ticket sur Discord.</Text>
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
      <Layout preview={`Connexion depuis ${o.device}${o.place ? `, ${o.place}` : ""}.`} kicker="Alerte de sécurité" reason="Tu reçois cet email car ton compte SYXTEE vient d'être ouvert depuis un appareil qu'on ne connaissait pas.">
        <Title lead="Nouvelle" hl="connexion." />
        <Text style={p}>Ton compte vient d&apos;être ouvert depuis un nouvel appareil :</Text>
        <Text style={{ ...p, ...mono, fontSize: "13px", lineHeight: "22px", color: C.fg }}>
          Appareil : {o.device}
          <br />
          Lieu (approximatif) : {o.place ?? "inconnu"}
          <br />
          Heure : {when(o.at)}
        </Text>
        <Text style={p}>C&apos;était toi ? Rien à faire.</Text>
        <Text style={p}>Ce n&apos;était pas toi ? Change ton mot de passe tout de suite.</Text>
        <Cta href={`${site.url}/mot-de-passe-oublie`}>Ce n&apos;était pas moi</Cta>
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
      <Layout
        preview={old ? `Ton email va passer à ${o.newEmail}.` : "Confirme ta nouvelle adresse."}
        kicker="Changement d'email"
        reason={old ? "Tu reçois cet email car un changement d'adresse a été demandé pour ton compte SYXTEE." : "Tu reçois cet email car cette adresse a été indiquée comme nouvelle adresse d'un compte SYXTEE."}
      >
        <Title lead={old ? "Changement" : "Nouvelle"} hl={old ? "d'email." : "adresse."} />
        <Text style={p}>
          Ancienne adresse : <span style={{ color: C.fg }}>{o.oldEmail}</span>
          <br />
          Nouvelle adresse : <span style={{ color: C.fg }}>{o.newEmail}</span>
        </Text>
        <Text style={p}>Le changement se fait quand les deux adresses ont confirmé. Lien valable 24 h.</Text>
        <Cta href={o.url}>Confirmer le changement</Cta>
        {old && <Text style={p}>Ce n&apos;est pas toi ? Ne clique pas, et change ton mot de passe.</Text>}
        <RawLink href={o.url} />
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
      <Layout
        preview={o.expiring ? `Fin de la formule ${name} le ${o.until ? day(o.until) : "bientôt"}.` : `Formule ${name} active${o.until ? ` jusqu'au ${day(o.until)}` : ""}.`}
        kicker="Formule"
        reason="Tu reçois cet email car la formule de ton compte SYXTEE a changé ou arrive à échéance."
      >
        <Title lead={o.expiring ? "Fin de formule" : "Formule"} hl={o.expiring ? "dans 7 jours." : `${name}.`} />
        {o.expiring ? (
          <Text style={p}>
            Ta formule {name} se termine le {o.until ? day(o.until) : "bientôt"}. Ensuite, ton compte repasse en formule Gratuit : tes relais sont conservés mais mis en pause.
          </Text>
        ) : (
          <Text style={p}>
            Ton compte est maintenant en formule {name}
            {o.until ? `, jusqu'au ${day(o.until)}` : ""}. Tout est déjà débloqué dans ton dashboard.
          </Text>
        )}
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
      <Layout preview={`Relais offert jusqu'au ${day(o.until)}.`} kicker="Programme Scan" reason="Tu reçois cet email car tes mesures avec l'analyseur réseau t'ont fait gagner un mois de relais.">
        <Title lead="1 mois de relais" hl="offert." />
        <Text style={p}>Merci pour tes mesures : elles rendent la carte de couverture plus précise pour tout le monde.</Text>
        <Text style={p}>Ton relais SYXTEE est offert jusqu&apos;au {day(o.until)}.</Text>
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
      <Layout preview={`Le prélèvement de ${amount} a été refusé.`} kicker="Abonnement" reason="Tu reçois cet email car le paiement de ton abonnement SYXTEE a échoué.">
        <Title lead="Paiement" hl="refusé." />
        <Text style={p}>Le prélèvement de {amount} pour ton abonnement SYXTEE n&apos;est pas passé. Ta carte a peut-être expiré ou manque de provision.</Text>
        <Text style={p}>On réessaie automatiquement dans les prochains jours. Ton accès continue d&apos;ici là. Mets ta carte à jour pour éviter la coupure.</Text>
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
      <Layout preview="Lien de connexion valable peu de temps." kicker="Connexion" reason="Tu reçois cet email car une connexion à SYXTEE a été demandée avec cette adresse. Pas toi ? Ignore-le.">
        <Title lead="Connexion à" hl="SYXTEE." />
        <Cta href={o.url}>Me connecter</Cta>
        <RawLink href={o.url} />
      </Layout>
    ),
  };
}

/** Code de vérification (réauthentification), si Supabase en demande un. */
export function code(o: { token: string }): Email {
  return {
    subject: `Ton code SYXTEE : ${o.token}`,
    element: (
      <Layout preview={`Code : ${o.token}`} kicker="Code de vérification" reason="Tu reçois cet email car une action sensible a été demandée sur ton compte SYXTEE.">
        <Title lead="Ton" hl="code." />
        <Text style={{ ...p, ...mono, fontSize: "28px", letterSpacing: "6px", lineHeight: "36px" }}>{o.token}</Text>
        <Text style={muted}>Ne le donne à personne, même au support.</Text>
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
