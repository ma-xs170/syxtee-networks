import { redirect } from "next/navigation";

// Le Multichat vit dans le Contrôle à distance : l'ancienne page y renvoie.
export default function MultichatPage() {
  redirect("/dashboard/controle-a-distance");
}
