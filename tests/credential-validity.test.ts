import { describe, expect, it } from "vitest";
import { credentialValidity, currentCredential } from "@/lib/credential-validity";

const TODAY = "2026-10-15";
const on = (expiresOn: string | null) => credentialValidity({ expiresOn }, TODAY);

describe("credential validity (N, O)", () => {
  it("no credential and no date are grey", () => {
    expect(credentialValidity(null, TODAY)).toMatchObject({ state: "none", label: "Sin credencial", tone: "neutral" });
    expect(on(null)).toMatchObject({ state: "no_date", tone: "neutral" });
  });

  it.each([
    ["2026-10-14", "expired", -1, "Vencida hace 1 día", "error"],
    ["2026-10-15", "expiring", 0, "Vence hoy", "warning"],
    ["2026-10-16", "expiring", 1, "Vence en 1 día", "warning"],
    ["2026-11-29", "expiring", 45, "Vence en 45 días", "warning"],
    ["2026-11-30", "valid", 46, "Vigente", "success"],
  ])("expires %s → %s", (date, state, days, label, tone) => {
    expect(on(date)).toEqual({ state, days, label, tone });
  });

  it("crosses month and leap-year boundaries by calendar day", () => {
    expect(credentialValidity({ expiresOn: "2028-03-01" }, "2028-02-28").days).toBe(2);
  });

  it("picks the latest credential or certificate as the current one", () => {
    const docs = [
      { kind: "credencial", createdAt: new Date("2026-01-01"), id: "old" },
      { kind: "constancia_vinculacion", createdAt: new Date("2026-09-01"), id: "link" },
      { kind: "certificado", createdAt: new Date("2026-06-01"), id: "new" },
    ];
    expect(currentCredential(docs)?.id).toBe("new");
    expect(currentCredential([{ kind: "otro", createdAt: new Date(), id: "x" }])).toBeNull();
  });
});
