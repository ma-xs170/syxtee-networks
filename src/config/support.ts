// Page « Soutenir » : coûts réels du service (TTC) et lien de dons.
// `sponsors` : adresse GitHub Sponsors (https://github.com/sponsors/<identifiant>). Vide tant que le profil n'est pas activé.
export const support = {
  sponsors: null as string | null,
  /** `perMonth` : euros par mois ; `perYear` : euros par an (affiché aussi en équivalent mensuel). */
  costs: [
    { label: "Serveur (VPS OVH, 6 vCPU)", note: "Site, relais SRTLA et RTMP, Core", perMonth: 13.28 },
    { label: "Nom de domaine syxtee-networks.fr", note: "Renouvelé chaque année", perYear: 5.41 },
  ] as { label: string; note: string; perMonth?: number; perYear?: number }[],
};

export const monthly = (c: { perMonth?: number; perYear?: number }) => c.perMonth ?? (c.perYear ?? 0) / 12;
export const totalMonthly = () => support.costs.reduce((sum, c) => sum + monthly(c), 0);
