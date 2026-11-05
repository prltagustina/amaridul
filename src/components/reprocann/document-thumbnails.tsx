"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";
import { cn } from "@/lib/cn";

/** One page (file) of a REPROCANN document: where it opens and whether it is a PDF. */
export type DocumentPage = { href: string; page: number; pdf: boolean; caption?: string };

const SIZES = { sm: 88, md: 120, lg: 152 } as const;

// The file routes log a thumbnail as a preview (once a day per person and document), not as an opening.
const previewOf = (href: string) => `${href}${href.includes("?") ? "&" : "?"}vista=miniatura`;

/**
 * pdf.js (Mozilla's PDF engine), loaded once and only when a PDF thumbnail comes into view. The
 * file is parsed in its own worker; nothing in the PDF runs (no XFA forms, no scripts) and the
 * site's security policy stays as it is. Only the first page is drawn, onto a canvas.
 */
let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  pdfjs ??= import("pdfjs-dist").then((lib) => {
    lib.GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" });
    return lib;
  });
  return pdfjs;
}

/** The first page of a PDF, drawn when it scrolls into view. */
function PdfFirstPage({ src, width }: { src: string; width: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"waiting" | "ready" | "error">("waiting");

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    const draw = async () => {
      try {
        const lib = await loadPdfjs();
        const res = await fetch(src, { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // A damaged file shows the placeholder; pdf.js only reports errors, not every repair it tries.
        task = lib.getDocument({ data: new Uint8Array(await res.arrayBuffer()), enableXfa: false, verbosity: lib.VerbosityLevel.ERRORS });
        const page = await (await task.promise).getPage(1);
        const scale = (width * Math.min(window.devicePixelRatio || 1, 2)) / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        el.width = Math.floor(viewport.width);
        el.height = Math.floor(viewport.height);
        await page.render({ canvas: el, viewport }).promise;
        if (!cancelled) setState("ready");
      } catch {
        if (!cancelled) setState("error");
      } finally {
        void task?.destroy();
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        void draw();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [src, width]);

  return (
    <>
      <canvas ref={canvas} aria-hidden className={cn("size-full object-contain", state !== "ready" && "invisible")} />
      {state !== "ready" && <Placeholder busy={state === "waiting"} />}
    </>
  );
}

function Placeholder({ busy }: { busy: boolean }) {
  return (
    <span aria-hidden className={cn("absolute inset-0 flex items-center justify-center bg-arena-50 text-text-muted", busy && "animate-pulse motion-safe-only")}>
      <FileText className="size-7" strokeWidth={1.25} />
    </span>
  );
}

function ImagePage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Placeholder busy={false} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-full object-contain" />;
}

/**
 * The pages of a document as thumbnails, instead of a line of text per file: a photo shows itself,
 * a PDF its first page. Each one opens the whole file in a new tab.
 */
export function DocumentThumbnails({ pages, size = "md", className }: { pages: DocumentPage[]; size?: keyof typeof SIZES; className?: string }) {
  if (!pages.length) return null;
  const width = SIZES[size];
  return (
    <ul className={cn("flex flex-wrap gap-3", className)}>
      {pages.map((p) => {
        const name = pages.length > 1 ? `Hoja ${p.page}` : p.pdf ? "PDF" : "Foto";
        return (
          <li key={p.href} className="min-w-0" style={{ width }}>
            <a href={p.href} target="_blank" rel="noopener" className="group block !text-foreground">
              <span className="relative block aspect-[3/4] overflow-hidden !rounded-[10px] border border-border bg-white shadow-[0_6px_16px_-12px_rgb(26_26_24/0.45)] transition-colors group-hover:border-forest/60">
                {p.pdf ? <PdfFirstPage src={previewOf(p.href)} width={width} /> : <ImagePage src={previewOf(p.href)} />}
                <span aria-hidden className="absolute inset-x-1.5 bottom-1.5 truncate !rounded-full bg-white/90 px-2 py-0.5 text-center text-[10px] font-medium text-forest shadow-sm">
                  {name}
                </span>
              </span>
              <span className="sr-only">{`Abrir ${pages.length > 1 ? `la hoja ${p.page}` : "el archivo"}${p.caption ? ` (${p.caption})` : ""}, en otra pestaña`}</span>
            </a>
            {p.caption && (
              <p aria-hidden className="mt-1 truncate text-[11px] text-text-muted" title={p.caption}>
                {p.caption}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
