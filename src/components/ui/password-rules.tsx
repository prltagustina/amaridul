import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/cn";

/** Visual password guidance: length first, no composition rules (NIST 800-63B). Mirrors MIN_PASSWORD_LENGTH in server/auth/password.ts. */
const MIN_LENGTH = 10;

export function passwordChecks(password: string, confirm: string) {
  return [
    { id: "length", label: "Al menos 10 caracteres", ok: password.length >= MIN_LENGTH },
    { id: "match", label: "Las dos contraseñas coinciden", ok: password.length > 0 && password === confirm },
  ];
}

export function PasswordRules({ password, confirm }: { password: string; confirm: string }) {
  return (
    <ul className="space-y-1.5 text-small" aria-label="Requisitos de la contraseña">
      {passwordChecks(password, confirm).map((r) => (
        <li key={r.id} className={cn("flex items-center gap-2", r.ok ? "text-success-fg" : "text-text-muted")}>
          {r.ok ? <Check aria-hidden className="size-4" strokeWidth={2} /> : <Circle aria-hidden className="size-3.5" strokeWidth={1.5} />}
          {r.label}
          <span className="sr-only">{r.ok ? ": cumplido" : ": pendiente"}</span>
        </li>
      ))}
    </ul>
  );
}
