import { redirect } from "next/navigation";

// La mire de coupure est native sur tous les relais : plus de page dédiée. L'état de la mire est sur la fiche de chaque relais.
export default function MirePage() {
  redirect("/dashboard/relais");
}
