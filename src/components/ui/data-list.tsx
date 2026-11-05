import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Shown as the card title on mobile. */
  primary?: boolean;
  className?: string;
};

/**
 * Table on desktop, stacked cards on mobile (no horizontal scrolling tables). A light header,
 * compact rows without stripes, and the record's name as the link to it.
 */
export function DataList<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  caption,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  caption: string;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary);
  return (
    <>
      <div className="relative hidden overflow-x-auto !rounded-card border border-mist-line bg-white md:block">
        <table className="w-full text-left text-[0.9375rem]">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-mist-line bg-arena-50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className="px-4 py-3 text-xs font-semibold tracking-[0.06em] whitespace-nowrap text-text-muted uppercase">
                  {c.header}
                </th>
              ))}
              {rowHref && (
                <th scope="col" className="w-12">
                  <span className="sr-only">Abrir</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-mist-line transition-colors last:border-0 hover:bg-arena-50/70">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-foreground", c.className)}>
                    {rowHref && c === primary ? (
                      <Link href={rowHref(row)} className="font-medium !text-foreground underline-offset-4 hover:!text-forest hover:underline">
                        {c.render(row)}
                      </Link>
                    ) : (
                      c.render(row)
                    )}
                  </td>
                ))}
                {rowHref && (
                  <td className="px-2 text-right">
                    {/* The name is the link; the arrow is the same one, out of the tab order. */}
                    <Link href={rowHref(row)} tabIndex={-1} aria-hidden className="inline-flex size-9 items-center justify-center !rounded-full !text-forest hover:bg-forest-soft">
                      <ChevronRight className="size-5" strokeWidth={1.5} />
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2.5 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const body = (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="text-base font-medium text-foreground">{primary.render(row)}</div>
                {rowHref && <ChevronRight aria-hidden className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} />}
              </div>
              <dl className="mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-small">
                {rest.map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="text-text-muted">{c.header}</dt>
                    <dd className="text-foreground">{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            </>
          );
          return (
            <li key={rowKey(row)}>
              {rowHref ? (
                <Link href={rowHref(row)} className="block !rounded-card border border-mist-line bg-white p-4 transition-colors hover:border-forest/40">
                  {body}
                </Link>
              ) : (
                <div className="!rounded-card border border-mist-line bg-white p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Definition list for detail pages (label / value pairs). */
export function DetailList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 }) {
  return (
    <dl className={cn("grid gap-x-8 gap-y-4", columns === 2 && "sm:grid-cols-2")}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0 space-y-0.5">
          <dt className="text-sm text-text-muted">{i.label}</dt>
          <dd className="text-base text-foreground [overflow-wrap:anywhere]">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
