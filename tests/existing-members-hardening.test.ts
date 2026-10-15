import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { admissions, auditLogs, existingMemberRequests, members, personIdentities } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { admissionInput, elevateToCommission, submitAdmission } from "@/server/admissions";
import { decisionInput, recordDecision } from "@/server/members";
import { createPreAdmission, inviteToAdmission, preAdmissionInput } from "@/server/pre-admissions";
import {
  convertPreAdmission,
  ExistingMemberError,
  existingMemberInput,
  institutionalInput,
  PRIVACY_NOTICE_SHA256,
  registerExistingMember,
  rejectExistingMemberRequest,
  submitExistingMemberRequest,
} from "@/server/existing-members";
import { existingMemberWritesEnabled } from "@/server/env";
import { makeContext } from "./helpers/context";

type Ctx = Awaited<ReturnType<typeof makeContext>>;
let ctx: Ctx;
let adminId: string;
const baseURL = "https://amaridul.test";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.endurecimiento@example.com")).id;
});

const form = (dni: string, patch: Record<string, unknown> = {}) =>
  existingMemberInput.parse({ nombres: "Persona", apellidos: "Ficticia", dni, email: `p.${dni}@example.com`, nacimiento: "1982-02-02", domicilio: "Calle 9", localidad: "Localidad", provincia: "Santa Fe", cp: "2000", numeroSocio: "", privacidad: true, confirmacion: true, ...patch });
async function submit(dni: string, patch: Record<string, unknown> = {}) {
  const r = await submitExistingMemberRequest(ctx.db, { rings: ctx.rings, email: new MemoryEmailSender() }, form(dni, patch), null);
  const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, (r as { reference: string }).reference));
  return row;
}
const deps = () => ({ email: new MemoryEmailSender(), baseURL, rings: ctx.rings });
const institutional = (patch: Record<string, unknown> = {}) => institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "activo", since: "", minutesReference: "", status: "activo", ...patch });

describe("retention of the DNI kept in the request", () => {
  it("once registered, the request no longer holds the DNI: the member's identity is the only copy", async () => {
    const r = await submit("99000701");
    expect(r.dniEncrypted).not.toBeNull();
    await registerExistingMember(ctx.db, deps(), adminId, r.id, institutional());
    const [after] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    expect(after).toMatchObject({ dniEncrypted: null, dniLookup: null, dniLookupKeyVersion: null, birthDate: null, status: "matched" });
    expect(after.closedAt).not.toBeNull();
    // Kept: who, contact and the address (the legajo for members who never had an admission).
    expect(after).toMatchObject({ fullName: "Persona Ficticia", email: "p.99000701@example.com", address: "Calle 9" });
    const [m] = await ctx.db.select().from(members).where(eq(members.id, after.linkedMemberId!));
    const [identity] = await ctx.db.select().from(personIdentities).where(eq(personIdentities.personId, m.personId));
    expect(identity.dniEncrypted).toBeTruthy();
    expect(identity.birthDate).toBe("1982-02-02");
  });

  it("a rejected request drops DNI, birth date and address, and is due for purge after 3 months", async () => {
    const r = await submit("99000702");
    const now = new Date();
    await rejectExistingMemberRequest(ctx.db, adminId, r.id, "No figura en el registro.", now);
    const [after] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id));
    expect(after).toMatchObject({ dniEncrypted: null, dniLookup: null, birthDate: null, address: null, postalCode: null, status: "rejected" });
    const months = (after.retentionUntil!.getFullYear() - now.getFullYear()) * 12 + after.retentionUntil!.getMonth() - now.getMonth();
    expect(months).toBe(3);
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id));
    expect(logs.map((l) => l.action)).toEqual(["existing_member.request_received", "existing_member.rejected"]);
  });
});

describe("privacy acceptance", () => {
  it("keeps the date and the hash of the exact text shown", async () => {
    const r = await submit("99000703");
    expect(r.privacyAcceptedAt).not.toBeNull();
    expect(r.privacyNoticeSha256).toBe(PRIVACY_NOTICE_SHA256);
    expect(PRIVACY_NOTICE_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("'Es socio existente' only before a formal request", () => {
  async function preadmission(email: string) {
    const { id } = await createPreAdmission(
      ctx.db,
      { field: ctx.rings.field, email: new MemoryEmailSender() },
      preAdmissionInput.parse({ nombre: "Persona Ficticia", email, provincia: "Santa Fe", localidad: "Localidad", intereses: ["comunidad"], reprocann: "", participacion: "si", privacidad: true }),
    );
    return id;
  }
  const formal = (dni: string, email: string) =>
    admissionInput.parse({
      nombres: "Persona", apellidos: "Ficticia", dni, nacimiento: "1990-05-12", nacionalidad: "Argentina", domicilio: "Calle 1", localidad: "Localidad", provincia: "Santa Fe", cp: "2000",
      email, telefono: "+54 9 000 000-0001", emailNotificaciones: "", categoria: "adherente", interes: "", obligaciones: true, pacienteAcompanamiento: false, pacienteReprocann: "",
      pacienteInformado: false, estatuto: true, cuota: true, veracidad: true, cambios: true, datos: true, novedades: false, confirmacion: true,
    });
  async function sentFormal(dni: string) {
    const email = `f.${dni}@example.com`;
    const preId = await preadmission(email);
    const invite = new MemoryEmailSender();
    await inviteToAdmission(ctx.db, { email: invite, baseURL }, adminId, preId);
    await submitAdmission(ctx.db, { rings: ctx.rings, email: new MemoryEmailSender() }, tokenIn(invite.sent[0].text), formal(dni, email));
    const [adm] = await ctx.db.select().from(admissions).where(eq(admissions.preAdmissionId, preId));
    return { preId, admissionId: adm.id };
  }

  it("an invitation not used yet: converted, and the invitation link no longer sends a formal request", async () => {
    const preId = await preadmission("invitada.sin.usar@example.com");
    const invite = new MemoryEmailSender();
    await inviteToAdmission(ctx.db, { email: invite, baseURL }, adminId, preId);
    await convertPreAdmission(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, preId);
    const r = await submitAdmission(ctx.db, { rings: ctx.rings, email: new MemoryEmailSender() }, tokenIn(invite.sent[0].text), formal("99000710", "invitada.sin.usar@example.com"));
    expect(r).toMatchObject({ ok: false });
    expect((await ctx.db.select().from(admissions).where(eq(admissions.preAdmissionId, preId))).length).toBe(0);
  });

  it.each([
    ["formal request sent", "99000711", async () => {}],
    ["in Comisión", "99000712", async (admissionId: string) => elevateToCommission(ctx.db, adminId, admissionId)],
    [
      "decision recorded",
      "99000713",
      async (admissionId: string) => {
        await elevateToCommission(ctx.db, adminId, admissionId);
        await recordDecision(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, admissionId, decisionInput.parse({ decision: "diferida", meetingDate: "2026-10-10", minutes: "Acta 1", category: "" }));
      },
    ],
  ])("blocked once the %s, asking for manual review, and nothing changes", async (_, dni, advance) => {
    const { preId, admissionId } = await sentFormal(dni as string);
    await (advance as (id: string) => Promise<unknown>)(admissionId);
    await expect(convertPreAdmission(ctx.db, { email: new MemoryEmailSender(), baseURL }, adminId, preId)).rejects.toThrow(/revisión manual/);
    const requests = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.preAdmissionId, preId));
    expect(requests).toHaveLength(0);
  });
});

describe("member numbers", () => {
  it("a historical number is unique regardless of capitalisation, in the app and in the database", async () => {
    await registerExistingMember(ctx.db, deps(), adminId, (await submit("99000720")).id, institutional({ numberMode: "historic", memberNumber: "HX-0099" }));
    await expect(registerExistingMember(ctx.db, deps(), adminId, (await submit("99000721")).id, institutional({ numberMode: "historic", memberNumber: "hx-0099" }))).rejects.toBeInstanceOf(ExistingMemberError);
    const [m] = await ctx.db.select().from(members).where(eq(members.memberNumber, "HX-0099"));
    await expect(ctx.db.update(members).set({ memberNumber: "AD-9999" }).where(eq(members.id, m.id))).resolves.toBeDefined();
    const [other] = await ctx.db.select().from(members).where(eq(members.memberNumber, "AD-9999"));
    expect(other.userId).toBe(m.userId); // correcting a number keeps the same member and account
  });
});

describe("release switch", () => {
  it("is always on outside production, and in production only with EXISTING_MEMBERS=on", () => {
    expect(existingMemberWritesEnabled({ APP_ENV: "local", EXISTING_MEMBERS: undefined })).toBe(true);
    expect(existingMemberWritesEnabled({ APP_ENV: "production", EXISTING_MEMBERS: undefined })).toBe(false);
    expect(existingMemberWritesEnabled({ APP_ENV: "production", EXISTING_MEMBERS: "on" })).toBe(true);
  });
});
