"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { TextField } from "@/components/ui/field";
import { sendLinkCodeAction } from "./actions";

/** The member types their «código de vinculación» as REPROCANN shows it and sends it to the association. */
export function LinkCodeForm({ canSend, correcting }: { canSend: boolean; correcting: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!correcting);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <Button type="button" variant="ghost" className="-ml-2 min-h-10" onClick={() => setOpen(true)}>
        Corregir el código de vinculación
      </Button>
    );

  const send = () =>
    start(async () => {
      setError("");
      setSent(false);
      const r = await sendLinkCodeAction(code);
      if (!r.ok) return setError(r.error);
      setSent(true);
      setCode("");
      router.refresh();
    });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      {sent && (
        <Alert tone="success" live>
          Recibimos tu código de vinculación. Todavía no es la vinculación: cuando la asociación la haga en REPROCANN, acá vas a ver «Vinculación verificada».
        </Alert>
      )}
      <TextField
        id="link-code"
        label="Código de vinculación REPROCANN"
        hint="Tal como figura en tu «Registro de paciente», en «Identificación». No es tu DNI ni el número de tu credencial."
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={40}
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError("");
        }}
        error={error || undefined}
        className="font-mono tracking-wider"
      />
      {canSend ? (
        <Button type="submit" variant="secondary" loading={pending} loadingLabel="Enviando…" disabled={!code.trim()}>
          <Send aria-hidden className="size-4" strokeWidth={1.5} /> Agregar código
        </Button>
      ) : (
        <p className="text-small text-text-muted">Vista de demostración: para enviar tu código de vinculación, ingresá con tu cuenta.</p>
      )}
    </form>
  );
}
