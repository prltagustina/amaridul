import { requireAdmin } from "@/server/auth/session";
import { AdminHeader, EnvironmentNotice } from "./ui";

export default async function AdminHomePage() {
  const { user } = await requireAdmin();
  return (
    <>
      <EnvironmentNotice />
      <AdminHeader email={user.email} />
      <main className="flex-1 page-gutter pt-12 pb-12">
        <div className="content-column">
          <h1 className="font-medium text-[#3f6043]" style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>Panel</h1>
          <p className="mt-4 text-body text-text-muted">
            Las secciones de preadmisiones, admisiones y padrón se incorporan en la Fase 1.
          </p>
        </div>
      </main>
    </>
  );
}
