"use client";

import { useActionState, useState } from "react";
import { loginWithPassword, verifySecondFactor, type LoginState } from "../actions";
import { buttonClass, inputClass, linkButtonClass } from "../styles";

export default function LoginForm() {
  const [passwordState, submitPassword, pendingPassword] = useActionState<LoginState, FormData>(loginWithPassword, { step: "password" });
  const [factorState, submitFactor, pendingFactor] = useActionState<LoginState, FormData>(verifySecondFactor, { step: "second-factor" });
  const [method, setMethod] = useState<"totp" | "backup">("totp");

  if (passwordState.step === "second-factor") {
    return (
      <form action={submitFactor} className="mt-8 space-y-5" noValidate>
        <input type="hidden" name="method" value={method} />
        <label className="block text-sm">
          {method === "totp" ? "Código de tu app de autenticación" : "Código de respaldo"}
          <input
            name="code"
            required
            autoFocus
            autoComplete="one-time-code"
            inputMode={method === "totp" ? "numeric" : "text"}
            className={inputClass}
          />
        </label>
        {factorState.error && <p role="alert" className="text-sm text-[#8a2f2f]">{factorState.error}</p>}
        <button type="submit" disabled={pendingFactor} className={`${buttonClass} w-full`}>Verificar</button>
        <button type="button" className={linkButtonClass} onClick={() => setMethod(method === "totp" ? "backup" : "totp")}>
          {method === "totp" ? "Usar un código de respaldo" : "Usar la app de autenticación"}
        </button>
      </form>
    );
  }

  return (
    <form action={submitPassword} className="mt-8 space-y-5" noValidate>
      <label className="block text-sm">
        Email
        <input name="email" type="email" required autoComplete="username" defaultValue={passwordState.email} className={inputClass} />
      </label>
      <label className="block text-sm">
        Contraseña
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {passwordState.error && <p role="alert" className="text-sm text-[#8a2f2f]">{passwordState.error}</p>}
      <button type="submit" disabled={pendingPassword} className={`${buttonClass} w-full`}>Ingresar</button>
    </form>
  );
}
