import type { Metadata } from "next";
import Link from "next/link";
import { cormorant } from "@/app/fonts";
import { assertDemo, demoAttr } from "@/lib/demo";

// Evaluate the demo gate on every request, never at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Demo | Amarí Dul", robots: { index: false, follow: false } };

const LINKS = [
  { href: "/dev/recorrido", label: "Recorrido" },
  { href: "/dev/estilo", label: "Estilo" },
  { href: "/dev/estados", label: "Estados" },
];

// Development-only tooling: 404 outside the local/test demo environment.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  assertDemo();
  return (
    <div className={`${cormorant.variable} theme-hueso flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      <header className="border-b border-dashed border-accent/50 bg-info-bg page-gutter">
        <div className="admin-column flex min-h-12 flex-wrap items-center gap-x-6 gap-y-1 py-2">
          <span className="text-eyebrow text-info-fg">Amarí Dul · demo local</span>
          <nav aria-label="Herramientas de demo" className="flex gap-4 text-sm">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="!text-forest underline-offset-4 hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
