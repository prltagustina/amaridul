"use client";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";

/** The catalog or a product sheet could not be read: say so and offer to try again. */
export default function ProductosError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="page-gutter pt-8 pb-10">
      <div className="admin-column max-w-2xl space-y-4">
        <Alert tone="error" title="No pudimos cargar los productos" live>
          Probá de nuevo en unos minutos. Si sigue pasando, avisale a la asociación.
        </Alert>
        <Button variant="secondary" onClick={() => retry()}>
          Probar de nuevo
        </Button>
      </div>
    </main>
  );
}
