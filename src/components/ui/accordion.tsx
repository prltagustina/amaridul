"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type AccordionItem = { id: string; title: ReactNode; content: ReactNode };

/** Each item opens independently (not an FAQ-style "one at a time" accordion). */
export function Accordion({ items, className, headingLevel = 3 }: { items: AccordionItem[]; className?: string; headingLevel?: 2 | 3 | 4 }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const base = useId();
  const Heading = `h${headingLevel}` as "h3";
  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => {
        const isOpen = !!open[item.id];
        const panelId = `${base}-${item.id}-panel`;
        const buttonId = `${base}-${item.id}-button`;
        return (
          <div key={item.id} className="!rounded-card bg-surface-sunken">
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((o) => ({ ...o, [item.id]: !o[item.id] }))}
                className="flex w-full items-center justify-between gap-4 !rounded-card px-5 py-4 text-left text-cta text-foreground sm:px-6"
              >
                <span>{item.title}</span>
                <ChevronDown
                  aria-hidden
                  strokeWidth={1.5}
                  className={cn("size-5 shrink-0 text-brand transition-transform duration-300 motion-safe-only", isOpen && "rotate-180")}
                />
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!isOpen}
              className="px-5 pb-5 text-body text-text-muted sm:px-6"
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
