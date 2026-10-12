"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type AccordionItem = { id: string; title: ReactNode; content: ReactNode };

/**
 * FAQ accordion: opening one item closes the previous one, unless `multiple` is set.
 * "cards": white cards. "lines-dark": editorial hairline list for sections over a photo.
 */
export function Accordion({
  items,
  className,
  headingLevel = 3,
  multiple = false,
  variant = "cards",
}: {
  items: AccordionItem[];
  className?: string;
  headingLevel?: 2 | 3 | 4;
  multiple?: boolean;
  variant?: "cards" | "lines-dark";
}) {
  const lines = variant === "lines-dark";
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const base = useId();
  const Heading = `h${headingLevel}` as "h3";
  return (
    <div className={cn(lines ? "divide-y divide-white/20 border-y border-white/20" : "space-y-3", className)}>
      {items.map((item) => {
        const isOpen = !!open[item.id];
        const panelId = `${base}-${item.id}-panel`;
        const buttonId = `${base}-${item.id}-button`;
        return (
          <div key={item.id} className={cn(!lines && "!rounded-card border bg-white transition-colors", !lines && (isOpen ? "border-accent/50" : "border-mist-line"))}>
            <Heading className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen((o) => (multiple ? { ...o, [item.id]: !o[item.id] } : { [item.id]: !o[item.id] }))}
                className={cn(
                  "flex w-full items-center justify-between gap-4 text-left text-cta",
                  lines ? "py-5 text-white focus-visible:!outline-white" : cn("!rounded-card px-5 py-4 sm:px-6", isOpen ? "text-forest" : "text-foreground"),
                )}
              >
                <span>{item.title}</span>
                <ChevronDown
                  aria-hidden
                  strokeWidth={1.5}
                  className={cn("size-5 shrink-0 transition-transform duration-300 motion-safe-only", lines ? "text-white/80" : "text-forest", isOpen && "rotate-180")}
                />
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn("grid transition-[grid-template-rows] duration-300 ease-out motion-safe-only", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
            >
              <div className="overflow-hidden">
                <div className={cn("text-body", lines ? "pb-6 text-white/80" : "px-5 pb-5 text-text-muted sm:px-6")}>{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
