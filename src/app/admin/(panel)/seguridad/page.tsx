import { requireAdmin } from "@/server/auth/session";
import { AdminHeader, EnvironmentNotice } from "../ui";
import { BackupCodesForm, EnrollForm } from "./forms";

export default async function AdminSecurityPage() {
  const { user } = await requireAdmin({ allowWithoutSecondFactor: true });
  return (
    <>
      <EnvironmentNotice />
      <AdminHeader email={user.email} />
      <main className="flex-1 page-gutter pt-12 pb-12">
        <div className="content-column space-y-6">
          <h1 className="font-medium text-[#3f6043]" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Seguridad</h1>
          {user.twoFactorEnabled ? (
            <>
              <p className="text-body text-text-muted">La verificación en dos pasos está activa.</p>
              <BackupCodesForm />
            </>
          ) : (
            <>
              <p className="text-body text-text-muted">
                Para usar el panel tenés que activar la verificación en dos pasos con una app de autenticación
                (Google Authenticator, Microsoft Authenticator, 1Password u otra).
              </p>
              <EnrollForm />
            </>
          )}
        </div>
      </main>
    </>
  );
}
