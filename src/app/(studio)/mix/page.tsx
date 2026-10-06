import { redirect } from "next/navigation";

// Ancienne adresse du Studio : le pilotage d'OBS est dans Contrôle à distance.
export default function MixPage() {
  redirect("/dashboard/controle-a-distance");
}
