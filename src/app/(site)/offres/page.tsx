import { permanentRedirect } from "next/navigation";

// L'ancienne page « Invitation » est devenue « Demander l'accès » (/acces).
export default function OffresPage() {
  permanentRedirect("/acces");
}
