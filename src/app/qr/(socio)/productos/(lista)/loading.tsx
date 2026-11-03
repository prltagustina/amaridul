import { PageBand } from "@/components/brand/page-band";
import { Skeleton } from "@/components/ui/display";
import { CATALOG_BAND } from "./band";

export default function CatalogoLoading() {
  return (
    <main>
      <PageBand compact tone="green" width="wide" {...CATALOG_BAND} />
      <div className="page-gutter pt-6 pb-8">
        <div className="admin-column space-y-6" role="status" aria-live="polite">
          <span className="sr-only">Cargando los productos…</span>
          <Skeleton className="h-16 w-full" />
          <ul aria-hidden className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className="overflow-hidden !rounded-card border border-mist-line bg-white">
                <div className="h-[5.75rem] bg-forest/85" />
                <div className="space-y-4 bg-mist/60 p-4">
                  <Skeleton className="aspect-[4/3] h-auto w-full !rounded-[14px]" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-5 w-2/3" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
