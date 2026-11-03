import { notFound } from "next/navigation";

/**
 * Lots, traceability and deliveries are hidden from members until the association defines them
 * (decided 2026-11). The route answers "not found", with or without a session; the admin sections
 * and the local demo (/qr/trazabilidad/demo, development machine only) stay.
 */
export default function TrazabilidadPage() {
  notFound();
}
