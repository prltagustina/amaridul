export default function Hero() {
  return (
    <section className="w-full px-4 sm:px-8" style={{minHeight: "100dvh", display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "clamp(2rem, 5dvh, 4rem)", paddingBottom: "clamp(1rem, 3dvh, 2rem)"}}>
      <div className="max-w-4xl mx-auto text-center w-full" style={{display: "flex", flexDirection: "column", gap: "clamp(0.75rem, 2.5dvh, 3rem)"}}>
        {/* Logo - Mariposa dominante */}
        <div className="flex justify-center" style={{marginBottom: "clamp(-7rem, -9dvh, -7.5rem)"}}>
          <div style={{width: "clamp(11rem, 25dvh, 30rem)", height: "clamp(11rem, 25dvh, 30rem)", aspectRatio: "1"}}>
            <img
              src="/brand/logo.svg"
              alt="Amarí Dul"
              className="w-full h-full butterfly-flutter"
            />
          </div>
        </div>

        {/* Wordmark y Tagline */}
        <div style={{display: "flex", flexDirection: "column", gap: "clamp(0.75rem, 1.5dvh, 2rem)"}}>
          <img
            src="/brand/wordmark.svg"
            alt="Amarí Dul"
            className="w-full max-w-lg lg:max-w-2xl mx-auto h-auto"
          />
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="flex-1 h-px bg-[#3f6043]"></div>
            <p className="text-[#3f6043] font-light whitespace-nowrap" style={{fontSize: "clamp(1rem, 2.5dvh, 1.875rem)", letterSpacing: "0.5em"}}>
              ASOCIACIÓN CIVIL
            </p>
            <div className="flex-1 h-px bg-[#3f6043]"></div>
          </div>
        </div>

        {/* Frase institucional - Placeholder */}
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4">
          <p className="leading-relaxed text-text-muted font-light lg:whitespace-nowrap" style={{fontSize: "clamp(1rem, 2dvh, 1.75rem)"}}>
            [Frase institucional breve que define el propósito de Amarí Dul]
          </p>
        </div>
      </div>
    </section>
  );
}
