import type { ReactNode } from "react";
import { Card, StatusBadge } from "@/components/ui/display";
import { AdminPageHeader } from "./ui";

/** A section that exists in the menu but has no real records yet: it says so and shows no example data. */
export function InDevelopment({ title, purpose, planned }: { title: string; purpose: ReactNode; planned: string[] }) {
  return (
    <>
      <AdminPageHeader title={title} description={purpose} />
      <Card className="max-w-2xl space-y-4">
        <StatusBadge tone="warning">En desarrollo</StatusBadge>
        <p className="text-body">Esta sección todavía no tiene registros reales y no muestra datos de ejemplo.</p>
        <div className="space-y-2">
          <p className="text-small font-medium text-text-muted">Lo que va a permitir</p>
          <ul className="list-disc space-y-1.5 pl-5 text-small text-text-muted">
            {planned.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </Card>
    </>
  );
}
