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
