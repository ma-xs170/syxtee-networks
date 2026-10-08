"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

// Toast de confirmation en bas à droite (fond #111, filet fin). Une seule à la fois, disparaît seule.
type Tone = "ok" | "error";
const Ctx = createContext<(message: string, tone?: Tone) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: Tone; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((message: string, tone: Tone = "ok") => {
    clearTimeout(timer.current);
    setToast({ message, tone, n: Date.now() });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-20 right-4 z-[60] lg:bottom-14">
        {toast && (
          <p key={toast.n} role="status" className={`rise pointer-events-auto flex items-center gap-2.5 rounded-xl border bg-surface-2 px-4 py-3 text-sm shadow-lg ${toast.tone === "error" ? "border-bad/40 text-bad" : "border-line-strong text-foreground"}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${toast.tone === "error" ? "bg-bad" : "bg-ok"}`} />
            {toast.message}
          </p>
        )}
      </div>
    </Ctx.Provider>
  );
}
