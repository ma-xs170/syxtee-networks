// Codes d'erreur affichés sous le formulaire de connexion (?erreur=…), en français.
export const AUTH_ERRORS = {
  "lien-expire": "Ce lien de connexion a expiré ou a déjà servi. Demande-en un nouveau.",
  "email-invalide": "Adresse email invalide.",
  "compte-lie": "Ce compte est déjà lié à un autre compte SYXTEE. Connecte-toi avec la méthode utilisée à l'origine.",
  limite: "Trop de demandes pour cette adresse. Réessaie dans une heure.",
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
    case "access_denied":
      return "annule";
    default:
      return "oauth";
  }
}
