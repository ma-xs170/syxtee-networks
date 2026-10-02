import { redirect } from "next/navigation";

// Le détail d'un relais s'ouvre en modale sur la liste : l'ancien lien renvoie à la liste.
export default function RelayPage() {
  redirect("/dashboard/relais");
}
