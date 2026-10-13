import "server-only";
import { faqAnswers, faqQuestions } from "@/demo/content";
import { CONTACT } from "@/lib/constants";
import { isDemoEnabled } from "./demo";

// What the public site may show. Locally everything is visible (with DEV notes as a guide);
// in production only finished, working content is rendered.

/** The FAQ is published once every answer is approved. */
export function faqAvailable(): boolean {
  return isDemoEnabled() || faqQuestions.every((q) => Boolean(faqAnswers[q.id]));
}

/** Contact is published once at least one channel is confirmed. */
export function contactAvailable(): boolean {
  return isDemoEnabled() || Object.values(CONTACT).some(Boolean);
}
