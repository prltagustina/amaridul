"use client";

import { useActionState } from "react";
import {
  confirmEnrollment,
  regenerateBackupCodes,
  startEnrollment,
  type BackupCodesState,
  type EnrollState,
} from "../actions";
import { buttonClass, inputClass } from "../styles";

function BackupCodes({ codes }: { codes: string[] }) {
  return (
    <div className="border border-border bg-white p-5">
      <p className="text-sm text-foreground">
        Códigos de respaldo. <strong className="font-medium">Se muestran una sola vez.</strong> Cada uno sirve para un único
        ingreso si no tenés el teléfono. Guardalos en un lugar seguro y no los envíes por email.
      </p>
      <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((c) => (
          <li key={c}>{c}</li>
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
        <label className="block text-sm">
          Confirmá tu contraseña
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        {started.error && <p role="alert" className="text-sm text-[#8a2f2f]">{started.error}</p>}
        <button type="submit" disabled={pendingStart} className={buttonClass}>Empezar</button>
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
      <img src={started.qrDataUrl} alt="Código QR para la app de autenticación" width={220} height={220} />
      <p className="text-sm text-text-muted">
        Si no podés escanearlo, ingresá esta clave a mano: <code className="break-all font-mono text-foreground">{started.manualKey}</code>
      </p>
      {started.backupCodes && <BackupCodes codes={started.backupCodes} />}
      <form action={confirm} className="max-w-sm space-y-5">
        <label className="block text-sm">
          Código de 6 dígitos
          <input name="code" required inputMode="numeric" autoComplete="one-time-code" className={inputClass} />
        </label>
        {confirmed.error && <p role="alert" className="text-sm text-[#8a2f2f]">{confirmed.error}</p>}
        <button type="submit" disabled={pendingConfirm} className={buttonClass}>Activar</button>
      </form>
    </div>
  );
}

export function BackupCodesForm() {
  const [state, action, pending] = useActionState<BackupCodesState, FormData>(regenerateBackupCodes, {});
  if (state.backupCodes) return <BackupCodes codes={state.backupCodes} />;
  return (
    <form action={action} className="max-w-sm space-y-5">
      <p className="text-sm text-text-muted">Generar códigos de respaldo nuevos anula los anteriores.</p>
      <label className="block text-sm">
        Confirmá tu contraseña
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {state.error && <p role="alert" className="text-sm text-[#8a2f2f]">{state.error}</p>}
      <button type="submit" disabled={pending} className={buttonClass}>Generar códigos nuevos</button>
    </form>
  );
}
