import { readState } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { NotFoundState, OfflineState, ServerErrorState, SessionExpiredState, UnauthorizedState } from "@/components/ui/system-states";

const STATES = ["not-found", "expired", "unauthorized", "error", "offline"] as const;

export default async function EstadosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <main className="page-gutter">
      {state === "not-found" && <NotFoundState />}
      {state === "expired" && <SessionExpiredState />}
      {state === "unauthorized" && <UnauthorizedState />}
      {state === "error" && <ServerErrorState action={<Button>Probar de nuevo</Button>} />}
      {state === "offline" && <OfflineState />}
      <DevStateBar path="/dev/estados" states={STATES} current={state} label="Sistema" />
    </main>
  );
}
