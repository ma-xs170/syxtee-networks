// ID support des comptes : SYX-XXXX-XXXX, alphabet sans 0/O/1/I (généré en base, migration 0012).

export const SUPPORT_ID_RE = /^SYX-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

/** Remet en forme un ID tapé ou collé (« syx 7k3f92qd », « 7K3F-92QD ») ; null s'il ne peut pas être valide. */
export function normalizeSupportId(input: string): string | null {
  let s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("SYX")) s = s.slice(3);
  if (s.length !== 8) return null;
  const id = `SYX-${s.slice(0, 4)}-${s.slice(4)}`;
  return SUPPORT_ID_RE.test(id) ? id : null;
}
