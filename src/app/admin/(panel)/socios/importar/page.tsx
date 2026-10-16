import { requireAdmin } from "@/server/auth/session";
import { AdminPageHeader } from "../../../ui";
import { ImportFlow } from "./import-flow";

export default async function ImportarPadronPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/socios", label: "Socios" }}
        title="Importar padrón histórico"
        description="Primero se revisa el archivo sin cargar nada. Solo si el resultado es correcto se aplica. Los socios se reconocen por DNI; no se envían emails ni se crean cuentas."
      />
      <ImportFlow />
    </>
  );
}
