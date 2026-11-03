"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/field";
import { deleteTestExistingRequestAction } from "../actions";

/** TEMPORARY (testing phase): remove before delivery together with src/server/test-data.ts. */
export function DeleteTestRequest({ id, reference }: { id: string; reference: string }) {
  const [open, setOpen] = useState(false);
  const [confirmRef, setConfirmRef] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Card className="space-y-3 border-dashed border-error-fg/40">
        <h2 className="text-h3">Solicitud de prueba</h2>
        <p className="text-small text-text-muted">
          Borra esta solicitud y lo que se creó con ella: el socio, su cuenta y, si la solicitud los cargó, los datos de la persona y su DNI. Un socio que ya estaba en el padrón no se borra. No se puede deshacer. Disponible solo durante las pruebas.
        </p>
        <Button
          shape="admin"
          variant="danger"
          full
          onClick={() => {
            setConfirmRef("");
            setError("");
            setOpen(true);
          }}
          disabled={pending}
        >
          <Trash2 aria-hidden className="size-4" strokeWidth={1.5} /> Eliminar solicitud de prueba
        </Button>
      </Card>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Eliminar solicitud de prueba"
        description={reference}
        confirmLabel={pending ? "Eliminando…" : "Eliminar todo"}
        confirmVariant="danger"
        confirmDisabled={confirmRef.trim().toUpperCase() !== reference || pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await deleteTestExistingRequestAction(id, confirmRef);
            // On success the action redirects to the list; only a failure comes back here.
            if (r && !r.ok) setError(r.error);
          })
        }
      >
        <p className="text-body">Se borran la solicitud, el socio que se registró con ella y su cuenta, y los datos de la persona y su DNI si los cargó esta solicitud. No se puede deshacer.</p>
        {error && (
          <Alert tone="error" live>
            {error}
          </Alert>
        )}
        <TextField id="confirmar-referencia" label={`Escribí ${reference} para confirmar`} autoComplete="off" value={confirmRef} onChange={(e) => setConfirmRef(e.target.value)} />
      </Dialog>
    </>
  );
}
