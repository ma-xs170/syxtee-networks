import { redirect } from "next/navigation";

// /encodeur/interface : même page que /encodeur, la démo du tableau de bord a été retirée de la page.
export default function EncodeurInterfacePage() {
  redirect("/encodeur");
}
