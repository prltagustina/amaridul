import { CONTACT } from "@/lib/constants";

/** Pre-filled text for asking the association to update one's data. No personal data travels in the link. */
export const UPDATE_DATA_MESSAGE = "Hola, soy socio/a de Amarí Dul y necesito actualizar mis datos. ¿Me ayudan?";
export const MEMBER_QUESTION_MESSAGE = "Hola, soy socio/a de Amarí Dul y tengo una consulta.";
export const FEE_QUESTION_MESSAGE = "Hola, soy socio/a de Amarí Dul y tengo una consulta sobre la cuota.";
export const PUBLIC_QUESTION_MESSAGE = "Hola, quiero hacer una consulta a Amarí Dul.";

/**
 * A wa.me link to the association's official WhatsApp (CONTACT.whatsapp, international format with
 * country and area code). Null while that number is not configured or not a plausible phone
 * number, so no broken button is ever shown.
 */
export function officialWhatsAppLink(message: string, number: string = CONTACT.whatsapp): string | null {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
