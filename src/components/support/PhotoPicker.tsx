"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, X } from "@/components/icons";
import { MAX_PHOTO_BYTES, MAX_PHOTOS } from "@/lib/support-categories";

// Choix de photos pour un message : miniatures, retrait une par une, réduction dans le navigateur (1600 px, JPEG) pour
// que l'envoi reste léger même en 4G. Les fichiers partent avec le formulaire (champ « photos »).

async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? new File([blob], `${file.name.replace(/\.\w+$/, "")}.jpg`, { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export default function PhotoPicker() {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  // Le champ réel suit la liste (DataTransfer) ; un reset du formulaire (après envoi) vide la liste.
  useEffect(() => {
    if (!input.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    input.current.files = dt.files;
  }, [files]);
  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const clear = () => setFiles([]);
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  async function add(list: FileList | null) {
    if (!list) return;
    setProblem(null);
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_PHOTOS) {
        setProblem(`${MAX_PHOTOS} photos au plus.`);
        break;
      }
      if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) {
        setProblem("Formats acceptés : JPEG, PNG, WebP ou GIF.");
        continue;
      }
      const small = await shrink(f);
      if (small.size > MAX_PHOTO_BYTES) {
        setProblem("Une photo dépasse 4 Mo.");
        continue;
      }
      next.push(small);
    }
    setFiles(next);
    // Le champ de choix repart à zéro : le même fichier peut être rechoisi.
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm text-muted transition-colors hover:bg-foreground/10 hover:text-foreground">
          <Paperclip size={16} aria-hidden="true" />
          Ajouter une photo
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => void add(e.target.files)} />
        </label>
        {files.map((f, i) => (
          <span key={`${f.name}-${i}`} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob:), pas une image du site */}
            <img src={urls[i]} alt={f.name} className="h-10 w-10 rounded-lg border border-line object-cover" />
            <button
              type="button"
              onClick={() => setFiles(files.filter((_, j) => j !== i))}
              aria-label={`Retirer ${f.name}`}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-background text-foreground"
            >
              <X size={10} aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      {problem && (
        <p role="alert" className="mt-2 text-xs text-red-400/90">
          {problem}
        </p>
      )}
      {/* Champ réellement envoyé avec le formulaire. */}
      <input ref={input} type="file" name="photos" multiple tabIndex={-1} aria-hidden="true" className="hidden" />
    </div>
  );
}
