export default function Hero() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-10 lg:space-y-12">
        {/* Logo - Mariposa dominante */}
        <div className="flex justify-center -mb-16 sm:-mb-20 lg:-mb-28">
          <div className="w-48 h-48 sm:w-80 sm:h-80 lg:w-[32rem] lg:h-[32rem]">
            <img
              src="/brand/logo.svg"
              alt="Amarí Dul"
              className="w-full h-full butterfly-flutter"
            />
          </div>
        </div>

        {/* Wordmark y Tagline */}
        <div className="space-y-3 sm:space-y-4">
          <img
            src="/brand/wordmark.svg"
            alt="Amarí Dul"
            className="w-full max-w-lg lg:max-w-2xl mx-auto h-auto"
          />
          <div className="flex items-center justify-center gap-2 sm:gap-6 lg:gap-10">
            <div className="flex-1 h-px bg-[#3f6043]"></div>
            <p className="text-[#3f6043] font-light whitespace-nowrap" style={{fontSize: "clamp(1.25rem, 3.5vw, 1.875rem)", letterSpacing: "0.5em"}}>
              ASOCIACIÓN CIVIL
            </p>
            <div className="flex-1 h-px bg-[#3f6043]"></div>
          </div>
        </div>

        {/* Frase institucional - Placeholder */}
        <div className="mt-8 sm:mt-12 max-w-2xl lg:max-w-5xl mx-auto px-4">
          <p className="leading-relaxed text-text-muted font-light lg:whitespace-nowrap" style={{fontSize: "clamp(1.125rem, 4vw, 1.75rem)"}}>
            [Frase institucional breve que define el propósito de Amarí Dul]
          </p>
        </div>
      </div>
    </section>
  );
}
