"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import {
  confirmEnrollment,
  regenerateBackupCodes,
  startEnrollment,
  type BackupCodesState,
  type EnrollState,
} from "../../actions";

function BackupCodes({ codes }: { codes: string[] }) {
  return (
    <div className="space-y-4 !rounded-control border border-border bg-white p-5">
      <p className="flex items-start gap-2 text-small text-foreground">
        <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.5} />
        <span>
          Códigos de respaldo. <strong className="font-medium">Se muestran una sola vez.</strong> Cada uno sirve para un único ingreso si no tenés el
          teléfono. Guardalos en un lugar seguro y no los envíes por email.
        </span>
      </p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <li key={c} className="!rounded-md bg-surface-sunken/60 px-2 py-1 text-center">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EnrollForm() {
  const [started, start, pendingStart] = useActionState<EnrollState, FormData>(startEnrollment, {});
  const [confirmed, confirm, pendingConfirm] = useActionState<EnrollState, FormData>(confirmEnrollment, {});

  if (!started.qrDataUrl) {
    return (
      <form action={start} className="max-w-sm space-y-5">
        <PasswordField id="password" label="Confirmá tu contraseña" required autoComplete="current-password" />
        {started.error && (
          <Alert tone="error" live>
            {started.error}
          </Alert>
        )}
        <Button type="submit" shape="admin" loading={pendingStart} loadingLabel="Preparando…">
          Empezar
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="list-decimal space-y-2 pl-5 text-body text-text-muted">
        <li>Abrí tu app de autenticación y agregá una cuenta nueva.</li>
        <li>Escaneá este código QR con el teléfono.</li>
        <li>Escribí el código de 6 dígitos que muestra la app.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated server-side */}
      <img src={started.qrDataUrl} alt="Código QR para la app de autenticación" width={220} height={220} className="!rounded-control border border-border bg-white p-2" />
      <p className="text-small text-text-muted">
        Si no podés escanearlo, ingresá esta clave a mano: <code className="break-all font-mono text-foreground">{started.manualKey}</code>
      </p>
      {started.backupCodes && <BackupCodes codes={started.backupCodes} />}
      <form action={confirm} className="max-w-sm space-y-5">
        <TextField id="code" label="Código de 6 dígitos" required inputMode="numeric" autoComplete="one-time-code" className="font-mono tracking-[0.3em]" />
        {confirmed.error && (
          <Alert tone="error" live>
            {confirmed.error}
          </Alert>
        )}
        <Button type="submit" shape="admin" loading={pendingConfirm} loadingLabel="Verificando…">
          Activar
        </Button>
      </form>
    </div>
  );
}

export function BackupCodesForm() {
  const [state, action, pending] = useActionState<BackupCodesState, FormData>(regenerateBackupCodes, {});
  if (state.backupCodes) return <BackupCodes codes={state.backupCodes} />;
  return (
    <form action={action} className="max-w-sm space-y-5">
      <p className="text-small text-text-muted">Generar códigos de respaldo nuevos anula los anteriores.</p>
      <PasswordField id="password" label="Confirmá tu contraseña" required autoComplete="current-password" />
      {state.error && (
        <Alert tone="error" live>
          {state.error}
        </Alert>
      )}
      <Button type="submit" shape="admin" variant="secondary" loading={pending} loadingLabel="Generando…">
        Generar códigos nuevos
      </Button>
    </form>
  );
}
