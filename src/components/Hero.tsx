export default function Hero() {
  return (
    <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-10 lg:space-y-12">
        {/* Logo - Mariposa dominante */}
        <div className="flex justify-center -mb-16 sm:-mb-20 lg:-mb-28">
          <div className="w-48 h-48 sm:w-80 sm:h-80 lg:w-[28rem] lg:h-[28rem]">
            <img
              src="/brand/logo.svg"
              alt="Amarí Dul"
              className="w-full h-full butterfly-flutter"
            />
          </div>
        </div>

        {/* Wordmark y Tagline */}
        <div className="space-y-6 sm:space-y-8">
          <img
            src="/brand/wordmark.svg"
            alt="Amarí Dul"
            className="w-full max-w-lg mx-auto h-auto"
          />
          <img
            src="/brand/tagline.svg"
            alt="Asociación Civil"
            className="w-full max-w-lg mx-auto h-auto"
          />
        </div>

        {/* Frase institucional - Placeholder */}
        <div className="mt-8 sm:mt-12 max-w-2xl mx-auto">
          <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed text-text-muted font-light">
            [Frase institucional breve que define el propósito de Amarí Dul]
          </p>
        </div>
      </div>
    </section>
  );
}
