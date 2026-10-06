import { redirect } from "next/navigation";

// Ancienne adresse : le pilotage d'OBS est dans Contrôle à distance.
export default function ObsPage() {
  redirect("/dashboard/controle-a-distance");
}
