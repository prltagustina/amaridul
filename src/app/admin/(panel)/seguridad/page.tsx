import { ShieldCheck, ShieldAlert } from "lucide-react";
import { isSecondFactorRequired, requireAdmin } from "@/server/auth/session";
import { Alert, Card, StatusBadge } from "@/components/ui/display";
import { AdminPageHeader } from "../../ui";
import { BackupCodesForm, EnrollForm } from "./forms";

export default async function AdminSecurityPage() {
  const { user } = await requireAdmin({ allowWithoutSecondFactor: true });
  return (
    <>
      <AdminPageHeader title="Seguridad" description="Verificación en dos pasos y códigos de respaldo de tu cuenta." />
      <div className="max-w-2xl space-y-6">
        {user.twoFactorEnabled ? (
          <>
            <Card className="flex items-start gap-4">
              <ShieldCheck aria-hidden className="mt-0.5 size-6 shrink-0 text-forest" strokeWidth={1.5} />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-h3">Verificación en dos pasos</h2>
                  <StatusBadge tone="success">Activa</StatusBadge>
                </div>
                <p className="text-small text-text-muted">Cada ingreso pide el código de tu app de autenticación.</p>
              </div>
            </Card>
            <Card className="space-y-4">
              <h2 className="text-h3">Códigos de respaldo</h2>
              <BackupCodesForm />
            </Card>
          </>
        ) : (
          <>
            {!isSecondFactorRequired() && (
              <Alert tone="info" title="Opcional en este entorno local">
                En tu computadora podés usar el panel sin verificación en dos pasos. En producción sigue siendo obligatoria.
              </Alert>
            )}
            <Card className="flex items-start gap-4 border-warning-fg/30 bg-warning-bg/60">
              <ShieldAlert aria-hidden className="mt-0.5 size-6 shrink-0 text-warning-fg" strokeWidth={1.5} />
              <div className="space-y-1">
                <h2 className="text-h3 text-warning-fg">Activá la verificación en dos pasos</h2>
                <p className="text-small text-foreground">
                  Para usar el panel tenés que activarla con una app de autenticación (Google Authenticator, Microsoft Authenticator, 1Password u otra).
                </p>
              </div>
            </Card>
            <Card>
              <EnrollForm />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
