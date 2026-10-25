import { notFound } from "next/navigation";
import Shots from "./Shots";

// Page de démo pour les captures d'écran du site. Désactivée en production.
export default function RemoteShotsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Shots />;
}
