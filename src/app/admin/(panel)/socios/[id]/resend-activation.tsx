"use client";

import { useState, useTransition } from "react";
import { MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { resendMemberActivation } from "../../admisiones/actions";

export default function ResendActivation({ memberId }: { memberId: string }) {
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-3">
      {notice && (
        <Alert tone={notice.tone} live>
          {notice.text}
        </Alert>
      )}
      <Button
        shape="admin"
        variant="secondary"
        full
        loading={pending}
        loadingLabel="Enviando…"
        onClick={() =>
          startTransition(async () => {
            const r = await resendMemberActivation(memberId);
            setNotice(r.ok ? { tone: "success", text: "Enviamos un link de activación nuevo. El anterior dejó de funcionar." } : { tone: "error", text: r.error });
          })
        }
      >
        <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> Reenviar activación
      </Button>
    </div>
  );
}
