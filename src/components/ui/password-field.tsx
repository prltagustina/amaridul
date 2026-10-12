"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { FieldShell, controlClasses, describedBy } from "./field";

type Props = Omit<ComponentProps<"input">, "type" | "id"> & { id: string; label: ReactNode; hint?: ReactNode; error?: string };

export function PasswordField({ id, label, hint, error, className, ...rest }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={cn(controlClasses, "pr-12", className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center !rounded-control text-text-muted hover:text-forest"
        >
          <span className="sr-only">{visible ? "Ocultar contraseña" : "Mostrar contraseña"}</span>
          {visible ? <EyeOff aria-hidden className="size-5" strokeWidth={1.5} /> : <Eye aria-hidden className="size-5" strokeWidth={1.5} />}
        </button>
      </div>
    </FieldShell>
  );
}
