import "server-only";
import { CONTACT } from "@/lib/constants";
import { isDemoEnabled } from "./demo";

// What the public site may show. Locally everything is visible (with DEV notes as a guide).

/** Contact is published once at least one channel is confirmed. */
export function contactAvailable(): boolean {
  return isDemoEnabled() || Object.values(CONTACT).some(Boolean);
}

/**
 * Demonstrations with fictitious data that look like real features (the lot sheet, a WhatsApp
 * button without the official number): only on the development machine. Never on a deployment,
 * not even a preview (previews are behind Vercel's login, but they are not the place for them).
 */
export const localDemo = () => !process.env.VERCEL && isDemoEnabled();

/**
 * Traceability (lots, package codes, deliveries) is hidden from members until the association
 * defines it. The admin prototype screens with example data only render on the development machine
 * and only with FEATURE_TRACEABILITY=on; the member demo lives apart, at /qr/trazabilidad/demo.
 */
export const traceabilityPrototype = () => localDemo() && process.env.FEATURE_TRACEABILITY === "on";
