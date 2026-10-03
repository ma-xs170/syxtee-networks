import { redirect } from "next/navigation";

// Ancienne adresse : le studio est une page à part, /mix.
export default function ObsPage() {
  redirect("/mix");
}
