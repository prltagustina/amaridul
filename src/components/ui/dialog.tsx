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
  /** Only the confirm button (a closing step: «Listo»). */
  hideCancel?: boolean;
  shape?: "pill" | "admin";
  wide?: boolean;
};

/**
 * Native modal <dialog>: focus moves in and back to the opener, Escape closes it and the page
 * behind is inert, all from the browser. Laid out as header · body that scrolls · actions, centred
 * in the visible area: the actions never cover the content and nothing in the body can make it
 * wider than the screen. The page behind neither scrolls nor shifts while it is open
 * (`.dialog-panel` in globals.css).
 */
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
  hideCancel,
  shape = "admin",
  wide,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // On a phone the keyboard shrinks the visible area, not the layout: follow the visual viewport
  // so the dialog centres, with its actions, where it can be seen while typing or picking a date.
  useEffect(() => {
    const d = ref.current;
    const vv = typeof window === "undefined" ? null : window.visualViewport;
    if (!open || !d || !vv) return;
    const sync = () => {
      d.style.setProperty("--dialog-vh", `${Math.round(vv.height)}px`);
      d.style.setProperty("--dialog-top", `${Math.round(vv.offsetTop)}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      d.style.removeProperty("--dialog-vh");
      d.style.removeProperty("--dialog-top");
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("dialog-panel !rounded-card border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/40 open:flex open:flex-col", wide ? "max-w-2xl" : "max-w-lg")}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0 space-y-1">
          <h2 id={titleId} className="text-h2 text-forest [overflow-wrap:anywhere]">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-small text-text-muted">
              {description}
            </p>
          )}
        </div>
        <button type="button" onClick={onClose} className="-mt-1 -mr-2 flex size-11 shrink-0 items-center justify-center !rounded-control text-text-muted hover:text-forest">
          <span className="sr-only">Cerrar</span>
          <X aria-hidden className="size-5" strokeWidth={1.5} />
        </button>
      </div>
      {children && <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>}
      {onConfirm && (
        // One row, also on a phone: stacked buttons would take the height the body needs.
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-3 sm:px-6 sm:py-4 [&>*]:whitespace-nowrap [&>*:last-child]:flex-1 sm:[&>*:last-child]:flex-none">
          {!hideCancel && (
            <Button variant="ghost" shape={shape} onClick={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button variant={confirmVariant} shape={shape} onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </div>
      )}
    </dialog>
  );
}
