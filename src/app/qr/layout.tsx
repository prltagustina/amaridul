import { systemType } from "@/app/fonts";
import { demoAttr } from "@/lib/demo";

export default function QrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${systemType} theme-hueso flex min-h-screen flex-col bg-background text-foreground`} {...demoAttr()}>
      {children}
    </div>
  );
}
