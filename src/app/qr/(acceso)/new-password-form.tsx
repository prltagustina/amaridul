"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { PasswordField } from "@/components/ui/password-field";
import { PasswordRules, passwordChecks } from "@/components/ui/password-rules";

/** Shared by account activation and password recovery. Demo only: nothing is stored. */
export function NewPasswordForm({ submitLabel, loading: initialLoading = false, onDone, children }: { submitLabel: string; loading?: boolean; onDone: () => void; children?: ReactNode }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(initialLoading);

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const [length, match] = passwordChecks(password, confirm);
    const e: typeof error = {};
    if (!length.ok) e.password = "Usá al menos 10 caracteres. Una frase fácil de recordar funciona bien.";
    if (!match.ok) e.confirm = "Las contraseñas no coinciden.";
    setError(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    window.setTimeout(onDone, 700);
  }

  return (
    <Card>
      <form noValidate onSubmit={onSubmit} className="space-y-5" aria-busy={loading}>
        {children}
        <PasswordField id="new-password" label="Nueva contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error.password} />
        <PasswordField id="confirm-password" label="Repetí la contraseña" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error.confirm} />
        <PasswordRules password={password} confirm={confirm} />
        <Button type="submit" full size="lg" loading={loading} loadingLabel="Guardando…">
          {submitLabel}
        </Button>
      </form>
    </Card>
  );
}
