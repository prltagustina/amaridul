"use client";

import { useActionState, useState } from "react";
import { Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { loginWithPassword, verifySecondFactor, type LoginState } from "../actions";

export default function LoginForm({ initialStep = "password" }: { initialStep?: LoginState["step"] }) {
  const [passwordState, submitPassword, pendingPassword] = useActionState<LoginState, FormData>(loginWithPassword, { step: initialStep });
  const [factorState, submitFactor, pendingFactor] = useActionState<LoginState, FormData>(verifySecondFactor, { step: "second-factor" });
  const [method, setMethod] = useState<"totp" | "backup">("totp");

  if (passwordState.step === "second-factor") {
    return (
      <form action={submitFactor} className="space-y-5" noValidate>
        <div className="flex items-start gap-3">
          <Smartphone aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.5} />
          <div>
            <h2 className="text-h3">Verificación en dos pasos</h2>
            <p className="text-small text-text-muted">
              {method === "totp" ? "Abrí tu app de autenticación y escribí el código de 6 dígitos." : "Escribí uno de tus códigos de respaldo. Cada uno sirve una sola vez."}
            </p>
          </div>
        </div>
        <input type="hidden" name="method" value={method} />
        <TextField
          key={method}
          id="code"
          label={method === "totp" ? "Código de la app" : "Código de respaldo"}
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode={method === "totp" ? "numeric" : "text"}
          className="font-mono tracking-[0.2em]"
        />
        {factorState.error && (
          <Alert tone="error" live>
            {factorState.error}
          </Alert>
        )}
        <Button type="submit" shape="admin" full loading={pendingFactor} loadingLabel="Verificando…">
          Verificar
        </Button>
        <button type="button" className="min-h-10 text-small !text-brand underline underline-offset-4" onClick={() => setMethod(method === "totp" ? "backup" : "totp")}>
          {method === "totp" ? "Usar un código de respaldo" : "Usar la app de autenticación"}
        </button>
      </form>
    );
  }

  return (
    <form action={submitPassword} className="space-y-5" noValidate>
      <TextField id="email" type="email" label="Email" required autoComplete="username" defaultValue={passwordState.email} />
      <PasswordField id="password" label="Contraseña" required autoComplete="current-password" />
      {passwordState.error && (
        <Alert tone="error" live>
          {passwordState.error}
        </Alert>
      )}
      <Button type="submit" shape="admin" full loading={pendingPassword} loadingLabel="Ingresando…">
        Ingresar
      </Button>
    </form>
  );
}
