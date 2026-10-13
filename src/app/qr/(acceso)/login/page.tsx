import type { Metadata } from "next";
import { isDemoEnabled, readState } from "@/lib/demo";
import { ComingSoon } from "@/components/brand/coming-soon";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import MemberLoginForm from "./login-form";

export const metadata: Metadata = { title: "Acceso socios | Amarí Dul" };

const STATES = ["default", "loading", "error", "expired", "disabled"] as const;

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The member portal is not live yet: the public site gets an honest notice; the demo runs locally
  // and on private previews only.
  if (!isDemoEnabled()) {
    return (
      <ComingSoon eyebrow="Socios" title="Ingresá a tu espacio" tab="Acceso" heading="Estamos preparando el espacio de socios">
        <p>Muy pronto vas a poder ingresar con tu DNI para ver tu membresía, tus trámites y la trazabilidad de tu producto.</p>
      </ComingSoon>
    );
  }
  const state = await readState(searchParams, STATES);
  return (
    <>
      <MemberLoginForm key={state} demoState={state} />
      <DevStateBar path="/qr/login" states={STATES} current={state} label="Login socio" />
    </>
  );
}
