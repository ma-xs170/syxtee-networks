import { redirect } from "next/navigation";

// /encodeur/interface : même page que /encodeur, ouverte directement sur la démo du tableau de bord.
export default function EncodeurInterfacePage() {
  redirect("/encodeur#interface");
}
