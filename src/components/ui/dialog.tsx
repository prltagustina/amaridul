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
    if (open && !d.open) {
      d.showModal();
      // The dialog itself takes the focus (its title is read; Tab goes on from there), not the
      // close button, which would open wearing its focus ring.
      d.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // While it is open the page behind stays put. On an iPhone, overflow: hidden does not stop a
  // finger from scrolling the page under the dialog, and scrolling folds the browser's bars, which
  // moved everything: the page is held where it was, and goes back to that place on closing.
  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const body = document.body.style;
    const before = { position: body.position, top: body.top, left: body.left, right: body.right, width: body.width };
    Object.assign(body, { position: "fixed", top: `-${y}px`, left: "0", right: "0", width: "100%" });
    return () => {
      Object.assign(body, before);
      window.scrollTo({ top: y, behavior: "instant" });
    };
  }, [open]);

  // On a phone the keyboard shrinks the visible area, not the layout: only then the dialog follows
  // the visual viewport, so it centres, with its actions, where it can be seen while typing or
  // picking a date. Otherwise it stays where CSS puts it, still, in the middle of the screen.
  useEffect(() => {
    const d = ref.current;
    const vv = typeof window === "undefined" ? null : window.visualViewport;
    if (!open || !d || !vv) return;
    const sync = () => {
      if (vv.height < window.innerHeight - 80) {
        d.style.setProperty("--dialog-vh", `${Math.round(vv.height)}px`);
        d.style.setProperty("--dialog-top", `${Math.round(vv.offsetTop)}px`);
      } else {
        d.style.removeProperty("--dialog-vh");
        d.style.removeProperty("--dialog-top");
      }
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
      tabIndex={-1}
      onClose={onClose}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn("dialog-panel !rounded-card border border-border bg-surface p-0 text-foreground shadow-xl outline-none backdrop:bg-foreground/40 open:flex open:flex-col", wide ? "max-w-2xl" : "max-w-lg")}
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
      {/* Its own height (flex-basis auto), shrinking and scrolling only when the dialog reaches the
          screen's: with a basis of 0, Safari squeezed it to its padding. */}
      {children && <div className="min-h-0 min-w-0 flex-auto space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>}
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
