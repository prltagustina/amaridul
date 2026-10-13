"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { PasswordField } from "@/components/ui/password-field";
import { PasswordRules, passwordChecks } from "@/components/ui/password-rules";
import { TabbedCard } from "@/components/ui/technical";

/** Shared by account activation and password recovery. `onSave` returns an error message or null. */
export function NewPasswordForm({
  tab,
  submitLabel,
  loading: initialLoading = false,
  onSave,
  children,
}: {
  tab: string;
  submitLabel: string;
  loading?: boolean;
  onSave: (password: string) => Promise<string | null>;
  children?: ReactNode;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<{ password?: string; confirm?: string }>({});
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(initialLoading);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const [length, match] = passwordChecks(password, confirm);
    const e: typeof error = {};
    if (!length.ok) e.password = "Usá al menos 10 caracteres. Una frase fácil de recordar funciona bien.";
    if (!match.ok) e.confirm = "Las contraseñas no coinciden.";
    setError(e);
    setFailure("");
    if (Object.keys(e).length) return;
    setLoading(true);
    const problem = await onSave(password).catch(() => "No pudimos guardar la contraseña. Probá de nuevo en unos minutos.");
    if (problem) {
      setFailure(problem);
      setLoading(false);
    }
  }

  return (
    <TabbedCard tab={tab}>
      <form noValidate onSubmit={onSubmit} className="space-y-4" aria-busy={loading}>
        {children}
        {failure && (
          <Alert tone="error" live>
            {failure}
          </Alert>
        )}
        <PasswordField id="new-password" label="Nueva contraseña" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error.password} />
        <PasswordField id="confirm-password" label="Repetí la contraseña" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={error.confirm} />
        <PasswordRules password={password} confirm={confirm} />
        <Button type="submit" full size="lg" loading={loading} loadingLabel="Guardando…">
          {submitLabel}
        </Button>
      </form>
    </TabbedCard>
  );
}
