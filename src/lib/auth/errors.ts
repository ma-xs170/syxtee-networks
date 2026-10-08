// Codes d'erreur affichés sous le formulaire de connexion (?erreur=…), en français.
export const AUTH_ERRORS = {
  "lien-expire": "Ce lien a expiré ou a déjà servi. Demande-en un nouveau.",
  "email-invalide": "Adresse email invalide.",
  "compte-lie": "Ce compte Twitch est déjà lié à un autre compte SYXTEE.",
  identifiants: "Email (ou identifiant) ou mot de passe incorrect.",
  "email-non-verifie": "Confirme d'abord ton adresse : clique sur le lien reçu par email.",
  "mdp-fuite": "Ce mot de passe apparaît dans une fuite de données connue. Choisis-en un autre.",
  "limite-connexion": "Trop d'essais. Réessaie dans 15 minutes, ou choisis « Mot de passe oublié ? ».",
  limite: "Trop de demandes pour cette adresse. Réessaie dans une heure.",
  "compte-expire": "Ce compte temporaire a expiré. Demande à l'équipe SYXTEE d'en créer un nouveau.",
  annule: "Connexion annulée.",
  oauth: "La connexion a échoué. Réessaie.",
  indisponible: "Les comptes ne sont pas encore ouverts. Reviens bientôt.",
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

export const authErrorMessage = (code: string | undefined | null) =>
  code && code in AUTH_ERRORS ? AUTH_ERRORS[code as AuthErrorCode] : null;

/** Code d'erreur Supabase → notre code. */
export function mapSupabaseError(code: string | undefined | null): AuthErrorCode {
  switch (code) {
    case "otp_expired":
    case "flow_state_expired":
    case "flow_state_not_found":
    case "bad_code_verifier":
      return "lien-expire";
    case "identity_already_exists":
    case "email_exists":
    case "user_already_exists":
      return "compte-lie";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "limite";
    case "email_address_invalid":
      return "email-invalide";
    case "invalid_credentials":
      return "identifiants";
    case "email_not_confirmed":
      return "email-non-verifie";
    case "access_denied":
      return "annule";
    default:
      return "oauth";
  }
}
