"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MusicNotes, PersonSimpleWalk, Sailboat } from "@phosphor-icons/react/dist/ssr";
import { contactAction, type ContactState } from "@/app/(site)/contact/actions";

// Formulaire de demande de devis : événement, lieu, date, durée, besoins, description. Champ piège et horodatage antispam.
const field =
  "h-12 w-full rounded-xl border border-line bg-input px-4 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-foreground/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20";
const label = "text-sm font-medium";

const EVENT_TYPES = ["Mobilité", "Soirée", "Mer"];
const TYPE_ICONS: Record<string, React.ReactNode> = {
  Mobilité: <PersonSimpleWalk size={18} aria-hidden="true" />,
  Soirée: <MusicNotes size={18} aria-hidden="true" />,
  Mer: <Sailboat size={18} aria-hidden="true" />,
};

// Les 32 communes de Guadeloupe, plus une entrée pour un projet ailleurs.
const CITIES = [
  "Abymes", "Anse-Bertrand", "Baie-Mahault", "Baillif", "Basse-Terre", "Bouillante", "Capesterre-Belle-Eau", "Capesterre-de-Marie-Galante",
  "Deshaies", "Désirade (La)", "Gosier (Le)", "Gourbeyre", "Goyave", "Grand-Bourg", "Lamentin", "Morne-à-l'Eau", "Moule (Le)", "Petit-Bourg",
  "Petit-Canal", "Pointe-à-Pitre", "Pointe-Noire", "Port-Louis", "Saint-Claude", "Saint-François", "Saint-Louis", "Sainte-Anne", "Sainte-Rose",
  "Terre-de-Bas", "Terre-de-Haut", "Trois-Rivières", "Vieux-Fort", "Vieux-Habitants", "Autre (hors Guadeloupe)",
];

// Indicatifs téléphoniques avec drapeau : le champ affiche « 🇬🇵 +590 », la liste le pays en entier.
const DIALS = [
  ["🇬🇵", "Guadeloupe", "+590"], ["🇲🇶", "Martinique", "+596"], ["🇬🇫", "Guyane", "+594"], ["🇷🇪", "La Réunion", "+262"], ["🇫🇷", "France", "+33"],
  ["🇧🇪", "Belgique", "+32"], ["🇨🇭", "Suisse", "+41"], ["🇱🇺", "Luxembourg", "+352"], ["🇨🇦", "Canada", "+1"], ["🇺🇸", "États-Unis", "+1"],
  ["🇬🇧", "Royaume-Uni", "+44"], ["🇩🇪", "Allemagne", "+49"], ["🇪🇸", "Espagne", "+34"], ["🇮🇹", "Italie", "+39"], ["🇵🇹", "Portugal", "+351"],
  ["🇭🇹", "Haïti", "+509"], ["🇩🇴", "République dominicaine", "+1"], ["🇧🇷", "Brésil", "+55"], ["🇲🇦", "Maroc", "+212"], ["🇩🇿", "Algérie", "+213"],
  ["🇹🇳", "Tunisie", "+216"], ["🇸🇳", "Sénégal", "+221"], ["🇨🇮", "Côte d'Ivoire", "+225"], ["🇨🇲", "Cameroun", "+237"], ["🇲🇬", "Madagascar", "+261"],
].map(([flag, name, code]) => `${flag} ${name} ${code}`);
const dialShort = (o: string) => `${o.split(" ")[0]} ${o.split(" ").at(-1)}`;

// Liste déroulante du site (pas celle du système) : même rendu partout, au clavier comme à la souris.
const Select = ({ id, name, required, placeholder, options, icons, short, wide, bare, initial = "" }: { id: string; name: string; required?: boolean; placeholder: string; options: string[]; icons?: Record<string, React.ReactNode>; short?: (o: string) => string; wide?: boolean; bare?: boolean; initial?: string }) => {
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const pick = (o: string) => { setValue(o); setOpen(false); };
  // Saisie au clavier : les lettres tapées (sans tenir compte des accents ni des majuscules) amènent sur le premier choix qui commence ainsi, Entrée le valide.
  const typed = useRef({ text: "", at: 0 });
  const fold = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, " ").toLowerCase();
  const typeAhead = (key: string) => {
    const now = Date.now();
    typed.current.text = (now - typed.current.at > 900 ? "" : typed.current.text) + key;
    typed.current.at = now;
    const q = fold(typed.current.text);
    const i = options.findIndex((o) => fold(o).startsWith(q));
    const j = i >= 0 ? i : options.findIndex((o) => fold(o).includes(q));
    if (j >= 0) { setActive(j); setOpen(true); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && (e.key !== " " || (typed.current.text && Date.now() - typed.current.at < 900))) {
      e.preventDefault();
      typeAhead(e.key);
    } else if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setActive(Math.max(0, options.indexOf(value))); setOpen(true); }
      else setActive((i) => (i + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      pick(options[active]);
    }
  };
  return (
    <div ref={box} className="relative">
      <input name={name} value={value} required={required} readOnly tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-0" />
      <button type="button" id={id} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} onClick={() => { setActive(Math.max(0, options.indexOf(value))); setOpen((o) => !o); }} onKeyDown={onKey} onBlur={() => { typed.current.text = ""; }} className={`${bare ? "h-12 w-full rounded-l-xl bg-transparent px-4 text-sm text-foreground focus:outline-none focus-visible:bg-foreground/[0.06]" : field} flex items-center justify-between gap-3 pr-4 text-left ${value ? "" : "text-muted/70"}`}>
        <span className="flex min-w-0 items-center gap-2.5">{value && icons?.[value]}<span className="truncate">{value ? (short ? short(value) : value) : placeholder}</span></span>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <ul id={`${id}-list`} role="listbox" className={`absolute left-0 top-[calc(100%+6px)] z-20 max-h-64 ${wide ? "w-[17rem]" : "inset-x-0"} overflow-y-auto rounded-xl border border-foreground/20 bg-surface p-1 shadow-lg`}>
          {options.map((o, i) => (
            <li key={o} role="option" aria-selected={o === value} ref={open && i === active ? (el) => el?.scrollIntoView({ block: "nearest" }) : undefined} onPointerDown={(e) => e.preventDefault()} onClick={() => pick(o)} onMouseEnter={() => setActive(i)} className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 text-sm sm:min-h-10 ${i === active ? "bg-foreground/[0.08]" : ""} ${o === value ? "font-medium text-foreground" : "text-foreground/90"}`}>
              <span className="flex items-center gap-2.5">{icons?.[o]}{o}</span>
              {o === value && <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  const [openedAt] = useState(() => Date.now());

  if (state.ok) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-surface p-8 text-center sm:p-12">
        <p className="h-serif text-4xl">Demande <em>envoyée.</em></p>
        <p className="mx-auto mt-4 max-w-[46ch] text-sm leading-relaxed text-muted">Merci. On étudie ton projet et on revient vers toi par e-mail avec un devis gratuit et personnalisé.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="t" value={openedAt} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <label htmlFor="c-name" className={label}>Nom *</label>
          <input id="c-name" name="name" required maxLength={80} autoComplete="name" placeholder="Jean Dupont" className={field} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="c-email" className={label}>E-mail *</label>
          <input id="c-email" name="email" type="email" required maxLength={160} autoComplete="email" placeholder="jean@exemple.fr" className={field} />
        </div>
        <div className="grid gap-2 sm:col-span-2">
          <label htmlFor="c-phone" className={label}>Téléphone *</label>
          <div className="flex rounded-xl border border-line bg-input transition-colors focus-within:border-foreground/50 focus-within:ring-2 focus-within:ring-foreground/20">
            <div className="w-[8.5rem] shrink-0 border-r border-line"><Select id="c-phone-code" name="phone_code" required placeholder="Pays" options={DIALS} initial={DIALS[0]} short={dialShort} wide bare /></div>
            <input id="c-phone" name="phone_number" type="tel" inputMode="tel" required minLength={6} maxLength={20} autoComplete="tel-national" placeholder="690 12 34 56" className="h-12 min-w-0 flex-1 rounded-r-xl bg-transparent px-4 text-sm text-foreground placeholder:text-muted/70 focus:outline-none" />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="c-type" className={label}>Type d&apos;événement *</label>
          <Select id="c-type" name="event_type" required placeholder="Sélectionne un type" options={EVENT_TYPES} icons={TYPE_ICONS} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="c-location" className={label}>Ville *</label>
          <Select id="c-location" name="location" required placeholder="Sélectionne une ville" options={CITIES} />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="c-message" className={label}>Décris ton projet *</label>
        <textarea id="c-message" name="message" required minLength={10} rows={5} maxLength={1200} placeholder="Ton projet, le parcours, les contraintes, ton budget approximatif…" className={`${field} h-auto py-3`} />
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-input p-4 text-sm leading-relaxed text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--foreground)]" />
        <span>J&apos;accepte que mes données soient utilisées pour me recontacter au sujet de ce devis. <a href="/confidentialite" className="font-medium text-foreground underline underline-offset-4">Politique de confidentialité</a></span>
      </label>

      {state.error && (
        <p role="alert" className="flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bad" />
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-foreground px-6 text-[15px] font-medium text-background transition-opacity hover:opacity-85 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
        {pending ? <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" /> : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>}
        {pending ? "Envoi…" : "Envoyer ma demande de production"}
      </button>
    </form>
  );
}
