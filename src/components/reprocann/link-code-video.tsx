import { Download } from "lucide-react";
import { LINK_CODE_STEPS, LINK_CODE_VIDEO } from "@/lib/reprocann-help";
import { cn } from "@/lib/cn";

/** The association's 30-second video on where to find the «código de vinculación», played on the page. */
export function LinkCodeVideo({ id, className }: { id?: string; className?: string }) {
  return (
    <video
      id={id}
      controls
      playsInline
      preload="none"
      poster={LINK_CODE_VIDEO.poster}
      width={LINK_CODE_VIDEO.width}
      height={LINK_CODE_VIDEO.height}
      aria-label="Video: dónde encontrar tu código de vinculación de REPROCANN. 30 segundos, sin sonido, con los pasos escritos en pantalla."
      className={cn("h-auto w-full !rounded-[18px] border border-mist-line bg-forest shadow-[0_18px_40px_-28px_rgba(26,26,24,0.45)]", className)}
    >
      <source src={LINK_CODE_VIDEO.src} type="video/mp4" />
    </video>
  );
}

/**
 * The video beside the steps, with «Descargar» at its top right: an iPhone's player offers no way
 * to save it, and it is sent on by WhatsApp. On a phone it keeps its own proportions; from 1024 px
 * it fills its frame, as tall as the steps beside it (`className` sets the frame's width there).
 */
export function LinkCodeVideoFrame({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[16rem] lg:mx-0 lg:h-full lg:max-w-none", className)}>
      <LinkCodeVideo className="lg:absolute lg:inset-0 lg:size-full lg:object-cover" />
      <a
        href={LINK_CODE_VIDEO.src}
        download="amaridul-codigo-de-vinculacion.mp4"
        className="absolute top-3 right-3 z-10 inline-flex min-h-9 items-center gap-1.5 !rounded-full bg-black/45 px-3 text-sm font-medium !text-white backdrop-blur-sm hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Download aria-hidden className="size-4" strokeWidth={1.75} />
        Descargar<span className="sr-only"> el video (MP4, 0,8 MB)</span>
      </a>
    </div>
  );
}

/** The same steps, written: for whoever prefers reading, or cannot play the video. */
export function LinkCodeSteps({ className }: { className?: string }) {
  return (
    <ol className={cn("list-decimal space-y-1.5 pl-5 marker:text-forest", className)}>
      {LINK_CODE_STEPS.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}
