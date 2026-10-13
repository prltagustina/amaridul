import type { Metadata } from "next";
import { isDemoEnabled, readState } from "@/lib/demo";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import ActivateFlow from "./activate-flow";

export const metadata: Metadata = { title: "Activar cuenta | Amarí Dul" };

const STATES = ["default", "loading", "expired", "unauthorized", "success"] as const;

export default async function ActivatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <>
      <ActivateFlow key={state} initial={state} demo={isDemoEnabled()} />
      <DevStateBar path="/qr/activar" states={STATES} current={state} label="Activación" />
    </>
  );
}
