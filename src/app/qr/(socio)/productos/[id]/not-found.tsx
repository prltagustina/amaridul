import { LinkButton } from "@/components/ui/button";

/** A product that is not active (or never existed): the link no longer leads anywhere. */
export default function ProductoNoDisponible() {
  return (
    <main className="page-gutter pt-10 pb-12">
      <div className="admin-column max-w-2xl space-y-4">
        <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">Productos</p>
        <h1 className="text-h2 text-forest">Este producto no está disponible</h1>
        <p className="text-text-muted">Puede que la asociación lo haya dejado de ofrecer o que el enlace no sea correcto.</p>
        <LinkButton href="/qr/mi-espacio#productos" variant="secondary">
          Volver a Mi espacio
        </LinkButton>
      </div>
    </main>
  );
}
