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
 * its «Copiar» beside it, on the value's line. From 22rem the button says «Copiar»; from 14.5rem,
 * only its icon (the name stays for screen readers and as a tooltip); narrower (a 320 px phone), the
 * button goes under the value. The value's size goes up in steps with the card's width, each one
 * leaving at least 7 % to spare, so a 22-digit CVU stays on one line (a monospace digit is 0.6em,
 * 22 of them 13.2em) in every browser. Steps and not container units: Safari sized those larger.
 */
export function CopyField({ name, label, value, className }: { /** What it is, as shown: «Alias», «CVU». */ name: string; /** For «Copiar …» and the announcement. */ label: string; value: string; className?: string }) {
  const { text, state, copy } = useCopy(value);
  return (
    <div className={cn("@container min-w-0", className)}>
      <p className="text-sm text-white/80">{name}</p>
      <div className="mt-1.5 flex flex-col items-start gap-2 @min-[14.5rem]:flex-row @min-[14.5rem]:items-center @min-[14.5rem]:justify-between">
        <p
          ref={text as React.RefObject<HTMLParagraphElement>}
          className="min-w-0 font-mono text-[0.8125rem] break-all text-white tabular-nums select-all @min-[12.5rem]:@max-[14.5rem]:text-[0.875rem] @min-[15.5rem]:@max-[17rem]:text-[0.875rem] @min-[17rem]:@max-[18.5rem]:text-[0.96875rem] @min-[18.5rem]:@max-[20.5rem]:text-[1.0625rem] @min-[20.5rem]:@max-[22rem]:text-[1.15625rem] @min-[22rem]:@max-[24.5rem]:text-[1.0625rem] @min-[24.5rem]:text-[1.25rem]"
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
