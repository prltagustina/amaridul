import "server-only";
import { CONTACT } from "@/lib/constants";
import { isDemoEnabled } from "./demo";

// What the public site may show. Locally everything is visible (with DEV notes as a guide).

/** Contact is published once at least one channel is confirmed. */
export function contactAvailable(): boolean {
  return isDemoEnabled() || Object.values(CONTACT).some(Boolean);
}
