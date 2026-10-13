import type { Metadata } from "next";
import { isDemoEnabled, readState } from "@/lib/demo";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import RecoverFlow from "./recover-flow";

export const metadata: Metadata = { title: "Recuperar contraseña | Amarí Dul" };

const STATES = ["default", "enviado", "nueva", "expired", "success"] as const;

export default async function RecoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <>
      <RecoverFlow key={state} initial={state} demo={isDemoEnabled()} />
      <DevStateBar path="/qr/recuperar" states={STATES} current={state} label="Recuperar" />
    </>
  );
}
