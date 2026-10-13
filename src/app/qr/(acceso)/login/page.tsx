import type { Metadata } from "next";
import { readState } from "@/lib/demo";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import MemberLoginForm from "./login-form";

export const metadata: Metadata = { title: "Acceso socios | Amarí Dul" };

const STATES = ["default", "loading", "error", "expired", "disabled"] as const;

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const state = await readState(searchParams, STATES);
  return (
    <>
      <MemberLoginForm key={state} demoState={state} />
      <DevStateBar path="/qr/login" states={STATES} current={state} label="Login socio" />
    </>
  );
}
