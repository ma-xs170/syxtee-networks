import type { FaqItem } from "@/lib/faq";

export default function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map((item) => (
        <details key={item.q} className="group py-7">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-medium tracking-tight">
            {item.q}
            <span className="text-2xl font-light text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <p className="mt-4 max-w-[60ch] pr-8 text-base leading-relaxed text-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
