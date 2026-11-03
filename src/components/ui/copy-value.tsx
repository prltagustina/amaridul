"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A value the member copies (an alias, a CVU), shown exactly as it is. The button says it worked;
 * when the browser does not allow copying, the value is selected so it can be copied by hand.
 */
export function CopyValue({ label, value, className }: { label: string; value: string; className?: string }) {
  const text = useRef<HTMLSpanElement>(null);
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

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span ref={text} className="font-mono text-[1.0625rem] tracking-wide break-all text-forest tabular-nums select-all">
          {value}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-11 items-center gap-1.5 !rounded-full border border-forest/50 px-4 text-sm font-medium !text-forest hover:bg-forest-soft"
        >
          {state === "copied" ? <Check aria-hidden className="size-4" strokeWidth={1.75} /> : <Copy aria-hidden className="size-4" strokeWidth={1.5} />}
          {state === "copied" ? "Copiado" : `Copiar ${label}`}
        </button>
      </div>
      <p aria-live="polite" className={cn("text-small", state === "failed" ? "text-error-fg" : "sr-only")}>
        {state === "copied" ? `${label[0].toUpperCase()}${label.slice(1)} copiado.` : state === "failed" ? `No pudimos copiarlo. Ya quedó seleccionado: copialo a mano.` : ""}
      </p>
    </div>
  );
}
