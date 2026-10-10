import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Alert, EmptyState, LoadingBlock } from "@/components/ui/display";

export const LIST_STATES = ["default", "loading", "empty", "error"] as const;
export type ListState = (typeof LIST_STATES)[number];

/** Shared loading / empty / error rendering for admin lists. */
export function ListStateView({ state, emptyTitle, emptyDescription, children }: { state: ListState; emptyTitle: string; emptyDescription?: string; children: ReactNode }) {
  if (state === "loading") return <LoadingBlock label="Cargando…" lines={5} />;
  if (state === "error")
    return (
      <Alert tone="error" title="No pudimos cargar la información" live>
        Probá recargar la página. Si el problema sigue, revisá la conexión.
      </Alert>
    );
  if (state === "empty")
    return <EmptyState icon={<Inbox aria-hidden className="size-10" strokeWidth={1.25} />} title={emptyTitle} description={emptyDescription} />;
  return <>{children}</>;
}

export function Filters({ children }: { children: ReactNode }) {
  return <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtros">{children}</div>;
}
