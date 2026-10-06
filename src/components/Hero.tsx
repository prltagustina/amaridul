export default function Hero() {
  return (
    <section className="w-full px-6 sm:px-8" style={{minHeight: "calc(100svh - var(--nav-h))", display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: "clamp(2rem, 5svh, 4rem)", paddingBottom: "clamp(1rem, 3svh, 2rem)"}}>
      <div className="max-w-4xl mx-auto text-center w-full" style={{display: "flex", flexDirection: "column", gap: "clamp(0.75rem, 2.5svh, 3rem)"}}>
        {/* Logo - Mariposa dominante */}
        <div className="flex justify-center" style={{marginBottom: "clamp(-3rem, -9svh, -8.5rem)"}}>
          <div style={{width: "min(clamp(11rem, 30svh, 96rem), calc(100vw - 3rem))", height: "min(clamp(11rem, 30svh, 96rem), calc(100vw - 3rem))", aspectRatio: "1"}}>
            <img
              src="/brand/logo.svg"
              alt=""
              className="w-full h-full butterfly-flutter"
            />
          </div>
        </div>

        {/* Wordmark y Tagline */}
        <div className="flex flex-col gap-[clamp(0.75rem,1.5svh,2rem)] sm:gap-[clamp(1.375rem,2.5svh,2.75rem)]">
          <h1>
            <img
              src="/brand/wordmark.svg"
              alt="Amarí Dul"
              className="w-full max-w-lg lg:max-w-2xl mx-auto h-auto"
            />
          </h1>
          <div className="flex items-center justify-center gap-4 sm:gap-10">
            <div className="flex-1 h-px bg-[#3f6043]"></div>
            <p className="text-[#3f6043] font-light whitespace-nowrap sm:-mr-[0.5em]" style={{fontSize: "min(clamp(1rem, 2.5svh, 1.875rem), calc((100vw - 3rem) / 16.5))", letterSpacing: "0.5em"}}>
              ASOCIACIÓN CIVIL
            </p>
            <div className="flex-1 h-px bg-[#3f6043]"></div>
          </div>
        </div>

        {/* Frase institucional - Placeholder */}
        <div className="max-w-2xl lg:max-w-5xl mx-auto px-4">
          <p className="text-lead text-text-muted font-light lg:whitespace-nowrap">
            [Frase institucional breve que define el propósito de Amarí Dul]
          </p>
        </div>
      </div>
    </section>
  );
}
