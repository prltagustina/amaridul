"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./button";

/**
 * Copying a value: the button says it worked; when the browser does not allow copying, the value
 * is selected so it can be copied by hand.
 */
function useCopy(value: string) {
  const text = useRef<HTMLElement>(null);
  const [state, setState] = useState<"" | "copied" | "failed">("");

  useEffect(() => {
    if (state !== "copied") return;
    const t = window.setTimeout(() => setState(""), 2500);
    return () => window.clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      const node = text.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setState("failed");
    }
  }

  return { text, state, copy };
}

const announce = (label: string, state: "" | "copied" | "failed") =>
  state === "copied" ? `${label[0].toUpperCase()}${label.slice(1)} copiado.` : state === "failed" ? "No pudimos copiarlo. Ya quedó seleccionado: copialo a mano." : "";

/**
 * A value to copy (a link code), shown exactly as it is, with its button beside it. Value and button
 * share one line in any width: from 24rem the button says «Copiar código»; below, only its icon (the
 * name stays for screen readers and as a tooltip) and the value a size smaller.
 */
export function CopyValue({ label, value, className }: { label: string; value: string; className?: string }) {
  const { text, state, copy } = useCopy(value);
  return (
    <div className={cn("@container space-y-1.5", className)}>
      <div className="flex items-center gap-3">
        <span ref={text} className="min-w-0 font-mono text-[0.875rem] tracking-wide break-all text-forest tabular-nums select-all @2xs:text-[0.9375rem] @sm:text-[1.0625rem]">
          {value}
        </span>
        <button type="button" onClick={() => void copy()} aria-label={`Copiar ${label}`} title={`Copiar ${label}`} className={cn(buttonClasses({ variant: "neutral", size: "sm" }), "shrink-0 @max-sm:size-11 @max-sm:px-0")}>
          {state === "copied" ? <Check aria-hidden strokeWidth={1.75} /> : <Copy aria-hidden strokeWidth={1.5} />}
          <span className="@max-sm:hidden">{state === "copied" ? "Copiado" : `Copiar ${label}`}</span>
        </button>
      </div>
      <p aria-live="polite" className={cn("text-small", state === "failed" ? "text-error-fg" : "sr-only")}>
        {announce(label, state)}
      </p>
    </div>
  );
}

/**
 * A labelled value to copy, on a dark fill (the payment card): the name above, and the value with
 * its «Copiar» beside it, on the value's line. The value is sized from the width left for it, so a
 * 22-digit CVU stays on one line (a monospace digit with this tracking is under 0.63em, 22 of them
 * under 14em): from 22rem the button says «Copiar»; from 14.5rem, only its icon (the name stays for
 * screen readers and as a tooltip); narrower (a 320 px phone), the button goes under the value.
 */
export function CopyField({ name, label, value, className }: { /** What it is, as shown: «Alias», «CVU». */ name: string; /** For «Copiar …» and the announcement. */ label: string; value: string; className?: string }) {
  const { text, state, copy } = useCopy(value);
  return (
    <div className={cn("@container min-w-0", className)}>
      <p className="text-sm text-white/80">{name}</p>
      <div className="mt-1.5 flex flex-col items-start gap-2 @min-[14.5rem]:flex-row @min-[14.5rem]:items-center @min-[14.5rem]:justify-between @min-[14.5rem]:gap-3">
        <p
          ref={text as React.RefObject<HTMLParagraphElement>}
          className="min-w-0 font-mono text-[length:min(1.25rem,100cqw/14)] tracking-wide break-all text-white tabular-nums select-all @min-[14.5rem]:@max-[22rem]:text-[length:min(1.25rem,(100cqw_-_3.25rem)/14)] @min-[22rem]:text-[length:min(1.25rem,(100cqw_-_7rem)/14)]"
        >
          {value}
        </p>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Copiar ${label}`}
          title={`Copiar ${label}`}
          className={cn(
            buttonClasses({ variant: "neutral", size: "sm" }),
            "shrink-0 !bg-white/15 !text-white hover:!bg-white/25 focus-visible:!outline-white @min-[14.5rem]:@max-[22rem]:size-10 @min-[14.5rem]:@max-[22rem]:px-0",
          )}
        >
          {state === "copied" ? <Check aria-hidden strokeWidth={1.75} /> : <Copy aria-hidden strokeWidth={1.5} />}
          <span className="@min-[14.5rem]:@max-[22rem]:hidden">{state === "copied" ? "Copiado" : "Copiar"}</span>
        </button>
      </div>
      <p aria-live="polite" className={cn("text-small", state === "failed" ? "mt-1 text-white" : "sr-only")}>
        {announce(label, state)}
      </p>
    </div>
  );
}
