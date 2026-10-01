import { redirect } from "next/navigation";

// Ancienne adresse : le studio est une page à part, /studio.
export default function ObsPage() {
  redirect("/studio");
}
