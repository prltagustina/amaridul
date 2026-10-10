import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administración | Amarí Dul",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-background text-foreground">{children}</div>;
}
