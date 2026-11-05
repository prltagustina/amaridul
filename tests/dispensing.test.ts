// «Habilitado a dispensa»: only when the three conditions the member's space shows are met at
// once. Each one is checked on its own; uploading a credential or sending the link code meets
// none of them; an expired, observed or unreviewed credential does not count.
import { describe, expect, it } from "vitest";
import { credentialStatus } from "@/lib/credential-validity";
import { dispensingEligibility, linkageState, LINKAGE_TEXT } from "@/lib/dispensing";

const TODAY = "2026-11-04";
const verified = credentialStatus({ reviewStatus: "verificada", expiresOn: "2027-09-30" }, TODAY);
const linked = { verified: true, codeReceived: true };
const all = { membership: "activo" as const, credential: verified, linkage: linked };

describe("habilitado a dispensa", () => {
  it("is enabled when, and only when, the three conditions are met", () => {
    const r = dispensingEligibility(all);
    expect(r.eligible).toBe(true);
    expect(r.pending).toEqual([]);
    expect(r.conditions.map((c) => [c.key, c.met])).toEqual([
      ["membership", true],
      ["credential", true],
      ["linkage", true],
    ]);

    // Every combination with at least one condition missing is not enabled, and says which one.
    const membership = ["activo", "suspendido"] as const;
    const credential = [verified, credentialStatus({ reviewStatus: "pendiente", expiresOn: "2027-09-30" }, TODAY)];
    const linkage = [linked, { verified: false, codeReceived: true }];
    for (const m of membership)
      for (const c of credential)
        for (const l of linkage) {
          const e = dispensingEligibility({ membership: m, credential: c, linkage: l });
          const expected = m === "activo" && c === verified && l === linked;
          expect(e.eligible).toBe(expected);
          expect(e.pending.map((p) => p.key)).toEqual([...(m === "activo" ? [] : ["membership"]), ...(c === verified ? [] : ["credential"]), ...(l === linked ? [] : ["linkage"])]);
          for (const p of e.pending) expect(p.pending).toBeTruthy();
        }
  });

  it("uploading a credential or sending the code does not enable by itself", () => {
    const uploaded = credentialStatus({ reviewStatus: "pendiente", expiresOn: "2027-09-30" }, TODAY);
    const r = dispensingEligibility({ membership: "activo", credential: uploaded, linkage: { verified: false, codeReceived: true } }, "member");
    expect(r.eligible).toBe(false);
    expect(r.pending.map((p) => p.pending)).toEqual(["Tu credencial está en revisión: la asociación tiene que verificarla.", "La asociación recibió tu código y tiene que hacer la vinculación en REPROCANN."]);
  });

  it("respects the credential's expiry and its review", () => {
    const at = (reviewStatus: "pendiente" | "observada" | "verificada", expiresOn: string | null) => dispensingEligibility({ ...all, credential: credentialStatus({ reviewStatus, expiresOn }, TODAY) }).eligible;
    expect(at("verificada", "2026-11-20")).toBe(true); // «Vence pronto»: still in force
    expect(at("verificada", TODAY)).toBe(true); // «Vence hoy»: valid until the end of the day
    expect(at("verificada", "2026-11-03")).toBe(false); // expired yesterday
    expect(at("observada", "2027-09-30")).toBe(false);
    expect(at("pendiente", "2027-09-30")).toBe(false);
    expect(dispensingEligibility({ ...all, credential: credentialStatus(null, TODAY) }).eligible).toBe(false);
    // Once it expires, the enablement stops without anyone touching it.
    const credential = { reviewStatus: "verificada" as const, expiresOn: "2026-12-01" };
    expect(dispensingEligibility({ ...all, credential: credentialStatus(credential, "2026-12-01") }).eligible).toBe(true);
    expect(dispensingEligibility({ ...all, credential: credentialStatus(credential, "2026-12-02") }).eligible).toBe(false);
  });

  it("a suspended or withdrawn member is never enabled", () => {
    for (const membership of ["suspendido", "baja"] as const) {
      const r = dispensingEligibility({ ...all, membership });
      expect(r.eligible).toBe(false);
      expect(r.pending.map((p) => p.key)).toEqual(["membership"]);
    }
  });

  it("tells the link code apart from the linkage", () => {
    expect(linkageState(null)).toBe("missing");
    expect(linkageState({ verified: false, codeReceived: false })).toBe("missing");
    expect(linkageState({ verified: false, codeReceived: true })).toBe("received");
    expect(linkageState({ verified: true, codeReceived: true })).toBe("verified");
    expect(LINKAGE_TEXT.missing.member).toMatchObject({ status: "Pendiente", help: "Agregá tu código de vinculación de REPROCANN." });
    // A received code shows the member's part done (green, with its tick), but it is never the
    // linkage: its words are not «Verificada» and the condition stays pending.
    expect(LINKAGE_TEXT.received.member.status).toBe("Código recibido");
    expect(LINKAGE_TEXT.received.member.status).not.toBe(LINKAGE_TEXT.verified.member.status);
    expect(LINKAGE_TEXT.verified.member.status).toBe("Verificada");
    const received = dispensingEligibility({ ...all, linkage: { verified: false, codeReceived: true } }, "member");
    expect(received.eligible).toBe(false);
    expect(received.pending.map((p) => p.key)).toEqual(["linkage"]);
  });
});
