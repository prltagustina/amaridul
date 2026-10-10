"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, type ButtonVariant } from "./button";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  shape?: "pill" | "admin";
  wide?: boolean;
};

/** Native <dialog>: focus trap, Escape and inert background come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  onConfirm,
  confirmDisabled,
  shape = "admin",
  wide,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] !rounded-card border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/40",
        wide ? "max-w-2xl" : "max-w-lg",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="space-y-1">
          <h2 id={titleId} className="text-h2 text-brand">
            {title}
          </h2>
          {description && <p className="text-small text-text-muted">{description}</p>}
        </div>
        <button type="button" onClick={onClose} className="-mr-2 flex size-10 shrink-0 items-center justify-center !rounded-control text-text-muted hover:text-brand">
          <span className="sr-only">Cerrar</span>
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      {children && <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
      {onConfirm && (
        <div className="flex flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="ghost" shape={shape} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} shape={shape} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      )}
    </dialog>
  );
}
