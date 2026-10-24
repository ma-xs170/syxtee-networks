"use client";

import { usePathname } from "next/navigation";
import { Archive, CalendarBlank, Camera, ChartBar, ChatsCircle, CreditCard, FileText, FilmStrip, Gear, HardDrives, Broadcast, Question, PuzzlePiece, Radio, ShareNetwork, SlidersHorizontal, SquaresFour, UserCircle, UsersThree, WifiLow, type Icon } from "@phosphor-icons/react";

// Icône devant le titre d'une page du dashboard : la même que dans le menu, choisie d'après l'adresse (rien sur les pages inconnues, ni dans l'admin).
const ICONS: Record<string, Icon> = {
  "": SquaresFour,
  direct: SlidersHorizontal,
  destinations: ShareNetwork,
  serveurs: Radio,
  appareils: HardDrives,
  scenes: Archive,
  enregistrements: FilmStrip,
  calendrier: CalendarBlank,
  equipe: UsersThree,
  espaces: UsersThree,
  statistiques: ChartBar,
  aide: Question,
  plugin: PuzzlePiece,
  cam: Camera,
  lives: Broadcast,
  "connexion-basse": WifiLow,
  multichat: ChatsCircle,
  abonnement: CreditCard,
  parametres: Gear,
  conditions: FileText,
  compte: UserCircle,
};

export default function TitleIcon() {
  const path = usePathname() ?? "";
  const m = /^\/dashboard(?:\/([^/]+))?/.exec(path);
  const Ico = m ? ICONS[m[1] ?? ""] : undefined;
  if (!Ico) return null;
  return <Ico aria-hidden="true" weight="regular" className="size-[0.72em] shrink-0 text-foreground/80" />;
}
