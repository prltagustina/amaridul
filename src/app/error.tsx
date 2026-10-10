"use client";

import { Button } from "@/components/ui/button";
import { ServerErrorState } from "@/components/ui/system-states";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex-1 bg-background page-gutter">
      <ServerErrorState action={<Button onClick={reset}>Probar de nuevo</Button>} />
    </main>
  );
}
