import { redirect } from "next/navigation";

// « SYXTEE COMMUTATEUR » (maquette) n'existe plus : le pilotage d'OBS est dans Contrôle à distance.
export default function CommutateurPage() {
  redirect("/dashboard/controle-a-distance");
}
