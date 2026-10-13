import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import heroPhoto from "@/assets/demo/qr-portada-provisoria.jpg";
import { CircleLogo } from "@/components/brand/circle-logo";
import { institutionalPhrase } from "@/demo/content";

/** Same photographic ground as /qr: portrait photo, soft-focus middle on wide screens, light green veil. */
export default function Hero() {
  return (
    <section aria-label="Portada" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Provisional photo taken from the visual reference; replace with the commissioned shoot. */}
      <Image src={heroPhoto} alt="" fill preload placeholder="blur" quality={85} sizes="100vw" className="-z-20 object-cover object-center md:scale-110 md:blur-md" />
      <div aria-hidden className="absolute inset-y-0 left-0 -z-20 hidden w-[40%] [mask-image:linear-gradient(to_right,black_45%,transparent)] md:block">
        <Image src={heroPhoto} alt="" fill quality={85} sizes="40vw" className="object-cover object-bottom" />
      </div>
      <div aria-hidden className="absolute inset-y-0 right-0 -z-20 hidden w-[40%] [mask-image:linear-gradient(to_left,black_45%,transparent)] md:block">
        <Image src={heroPhoto} alt="" fill quality={85} sizes="40vw" className="object-cover object-top" />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(29_52_30/0.45)_0%,rgb(29_52_30/0.05)_45%,rgba(26,44,31,0.7)_100%)]" />

      <h1 className="sr-only">Amarí Dul, asociación civil</h1>

      <div className="page-gutter flex flex-1 flex-col items-center justify-center gap-6 pt-20 pb-24 text-center sm:gap-8">
        <CircleLogo className="w-[min(78vw,50svh,26rem)] lg:w-[min(56svh,30rem)]" />
        <p className="mx-auto max-w-[24ch] font-display text-[clamp(1.5rem,1.2rem+1.3vw,2.25rem)] leading-[1.15] font-medium text-white [text-shadow:0_1px_16px_rgba(0,0,0,0.4)] sm:max-w-[26ch]">{institutionalPhrase}</p>
        <Link href="/qr" className="font-ui inline-flex min-h-11 items-center gap-2 border-b border-white/50 text-[0.8125rem] tracking-[0.18em] !text-white uppercase transition-colors hover:border-white motion-safe-only">
          Más información <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
        </Link>
      </div>

      <a href="#sobre" className="absolute bottom-6 left-1/2 flex size-11 -translate-x-1/2 items-center justify-center !rounded-full !text-white hover:bg-white/10">
        <span className="sr-only">Ir a Sobre Amarí Dul</span>
        <ChevronDown aria-hidden className="size-7 animate-bounce motion-safe-only" strokeWidth={1.25} />
      </a>
    </section>
  );
}
