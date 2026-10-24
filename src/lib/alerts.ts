// Alertes Discord (réglages côté site). Même règle que le Core : seule une adresse de webhook Discord est acceptée.
export const DISCORD_RE = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d{15,25}\/[\w-]{20,100}$/;
