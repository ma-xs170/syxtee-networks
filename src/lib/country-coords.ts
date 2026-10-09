// Position approximative (centre) des pays les plus courants, pour estimer la latence vers un serveur depuis le pays choisi à la
// création du compte. Ordre de grandeur seulement : un pays absent de la liste n'a pas d'estimation (null).

const C: Record<string, [number, number]> = {
  FR: [46.6, 2.5], GP: [16.24, -61.53], MQ: [14.64, -61.02], GF: [4.0, -53.0], RE: [-21.1, 55.5], YT: [-12.8, 45.2], NC: [-21.3, 165.5], PF: [-17.7, -149.4],
  BE: [50.6, 4.7], CH: [46.8, 8.2], LU: [49.8, 6.1], MC: [43.7, 7.4], DE: [51.2, 10.4], ES: [40.2, -3.7], PT: [39.6, -8.0], IT: [42.8, 12.6], GB: [54.0, -2.5], IE: [53.4, -8.0],
  NL: [52.2, 5.3], DK: [56.0, 10.0], SE: [62.0, 15.0], NO: [64.5, 11.5], FI: [64.0, 26.0], PL: [52.0, 19.4], CZ: [49.8, 15.5], AT: [47.6, 14.1], HU: [47.2, 19.4], RO: [45.9, 24.9],
  BG: [42.7, 25.5], GR: [39.0, 22.0], TR: [39.0, 35.2], UA: [48.4, 31.2], RU: [61.5, 99.0],
  US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.5], BR: [-10.8, -52.9], AR: [-34.6, -63.6], CL: [-35.7, -71.5], CO: [4.6, -74.3], PE: [-9.2, -75.0], VE: [6.4, -66.6],
  EC: [-1.8, -78.2], UY: [-32.5, -55.8], DO: [18.7, -70.2], HT: [18.9, -72.3], CU: [21.5, -79.0], JM: [18.1, -77.3], PR: [18.2, -66.5],
  MA: [31.8, -7.1], DZ: [28.0, 2.6], TN: [33.9, 9.5], EG: [26.8, 30.8], SN: [14.5, -14.5], CI: [7.5, -5.5], CM: [7.4, 12.4], CD: [-2.9, 23.7], MG: [-18.8, 47.5], ZA: [-29.0, 24.0],
  NG: [9.1, 8.7], KE: [0.0, 37.9], GH: [7.9, -1.0], MU: [-20.3, 57.6],
  IL: [31.0, 34.9], SA: [24.0, 45.0], AE: [24.0, 54.0], QA: [25.3, 51.2], IN: [21.0, 78.0], PK: [30.4, 69.3], BD: [23.7, 90.4], CN: [35.9, 104.2], JP: [36.2, 138.3],
  KR: [36.5, 127.9], VN: [14.1, 108.3], TH: [15.9, 100.9], ID: [-2.5, 118.0], MY: [4.2, 102.0], SG: [1.35, 103.8], PH: [12.9, 121.8], AU: [-25.3, 133.8], NZ: [-41.0, 174.0],
};

/** Position du pays (code ISO à deux lettres), ou null si inconnue. */
export const countryCoords = (cc: string | null | undefined) => {
  const c = cc ? C[cc.toUpperCase()] : undefined;
  return c ? { lat: c[0], lon: c[1] } : null;
};
