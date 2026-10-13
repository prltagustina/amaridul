import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openPglite, type Database } from "@/server/db/client";
import { auditLogs, preAdmissions, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import {
  addPreAdmissionNote,
  changePreAdmissionStatus,
  checkInvitation,
  inviteToAdmission,
  latestInvitation,
  countPreAdmissions,
  createPreAdmission,
  getPreAdmission,
  InvalidTransitionError,
  listPreAdmissions,
  preAdmissionInput,
} from "@/server/pre-admissions";
import { freshRings } from "./helpers/context";

const valid = {
  nombre: "Persona Ficticia",
  email: "Persona.Ficticia@Example.com",
  telefono: "+54 9 000 000-0001",
  provincia: "Santa Fe",
  localidad: "Localidad Ficticia",
  intereses: ["orientacion", "comunidad"],
  reprocann: "en-tramite",
  participacion: "si",
  privacidad: true,
};

let db: Database;
let adminId: string;
beforeAll(async () => {
  db = await openPglite();
  const [u] = await db.insert(user).values({ name: "Admin Ficticio", email: "admin.pre@example.com", role: "ADMIN", status: "active" }).returning({ id: user.id });
  adminId = u.id;
});

describe("preadmission input", () => {
  it("accepts the public form and normalises the email", () => {
    const r = preAdmissionInput.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("persona.ficticia@example.com");
  });

  it.each([
    ["no privacy consent", { privacidad: false }],
    ["unknown province", { provincia: "Atlántida" }],
    ["unknown interest", { intereses: ["otra-cosa"] }],
    ["no interest", { intereses: [] }],
    ["short phone", { telefono: "123" }],
    ["bad email", { email: "sin-arroba" }],
    ["health interest without REPROCANN status", { intereses: ["orientacion"], reprocann: "" }],
  ])("rejects %s", (_, patch) => {
    expect(preAdmissionInput.safeParse({ ...valid, ...patch }).success).toBe(false);
  });

  it("does not ask REPROCANN for non-health interests", () => {
    expect(preAdmissionInput.safeParse({ ...valid, intereses: ["comunidad"], reprocann: "" }).success).toBe(true);
  });
});

describe("preadmission lifecycle", () => {
  it("stores it with a reference, encrypts the motivation, audits and emails", async () => {
    const rings = freshRings();
    const email = new MemoryEmailSender();
    const input = preAdmissionInput.parse(valid);
    const { id, reference } = await createPreAdmission(db, { field: rings.field, email }, input);

    expect(reference).toMatch(/^PRE-\d{4}-\d{4}$/);
    const [row] = await db.select().from(preAdmissions).where(eq(preAdmissions.id, id));
    expect(row.status).toBe("recibida");
    expect(row.motivationEncrypted).not.toContain("orientacion");
    expect(row.motivationEncrypted).not.toContain("en-tramite");

    const detail = await getPreAdmission(db, rings.field, id);
    expect(detail?.interests).toContain("Acceder a orientación sobre cannabis medicinal");
    expect(detail?.reprocann).toBe("En trámite");

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logs.map((l) => l.action)).toContain("pre_admission.received");
    expect(JSON.stringify(logs)).not.toContain("orientacion");

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0].to).toBe("persona.ficticia@example.com");
    expect(email.sent[0].subject).toContain(reference);
    expect(email.sent[0].idempotencyKey).toBe(`pre_admission_received:${reference}`);
  });

  it("keeps the request when the email fails", async () => {
    const rings = freshRings();
    const failing = { send: async () => Promise.reject(new Error("smtp down")) };
    const { id } = await createPreAdmission(db, { field: rings.field, email: failing }, preAdmissionInput.parse(valid));
    expect(await getPreAdmission(db, rings.field, id)).not.toBeNull();
  });

  it("the motivation does not decrypt with other keys", async () => {
    const { id } = await createPreAdmission(db, { field: freshRings().field, email: new MemoryEmailSender() }, preAdmissionInput.parse(valid));
    await expect(getPreAdmission(db, freshRings().field, id)).rejects.toThrow();
  });

  it("moves through review and closing, with notes", async () => {
    const rings = freshRings();
    const { id } = await createPreAdmission(db, { field: rings.field, email: new MemoryEmailSender() }, preAdmissionInput.parse(valid));
    const before = await countPreAdmissions(db, ["recibida"]);

    await changePreAdmissionStatus(db, adminId, id, "en-revision");
    expect(await countPreAdmissions(db, ["recibida"])).toBe(before - 1);
    expect((await listPreAdmissions(db, "en-revision")).some((r) => r.id === id)).toBe(true);

    await addPreAdmissionNote(db, adminId, id, "  Primer contacto por WhatsApp.  ");
    await addPreAdmissionNote(db, adminId, id, "   ");

    await expect(changePreAdmissionStatus(db, adminId, id, "cerrada")).rejects.toBeInstanceOf(InvalidTransitionError);
    await changePreAdmissionStatus(db, adminId, id, "cerrada", { reason: "Sin respuesta" });

    const detail = await getPreAdmission(db, rings.field, id);
    expect(detail?.status).toBe("cerrada");
    expect(detail?.closedReason).toBe("Sin respuesta");
    expect(detail?.notes.map((n) => n.body)).toEqual(["Primer contacto por WhatsApp."]);
    const [row] = await db.select().from(preAdmissions).where(eq(preAdmissions.id, id));
    expect(row.retentionUntil?.getTime()).toBeGreaterThan(row.closedAt!.getTime());

    await expect(changePreAdmissionStatus(db, adminId, id, "en-revision")).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("returns null for unknown or malformed ids", async () => {
    expect(await getPreAdmission(db, freshRings().field, "no-es-un-uuid")).toBeNull();
    expect(await getPreAdmission(db, freshRings().field, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});

describe("invitation to the formal admission", () => {
  const baseURL = "https://amaridul.test";
  const tokenFrom = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)?.[1] ?? "";

  async function received() {
    return createPreAdmission(db, { field: freshRings().field, email: new MemoryEmailSender() }, preAdmissionInput.parse(valid));
  }

  it("emails a personal link in the fragment and marks it invited", async () => {
    const { id, reference } = await received();
    const email = new MemoryEmailSender();
    const now = new Date("2026-10-13T12:00:00Z");
    const { expiresAt, emailed } = await inviteToAdmission(db, { email, baseURL }, adminId, id, now);

    expect(emailed).toBe(true);
    expect(expiresAt.toISOString()).toBe("2026-10-20T12:00:00.000Z");
    expect(email.sent[0].to).toBe("persona.ficticia@example.com");
    expect(email.sent[0].text).toContain(`${baseURL}/admision#t=`);
    expect(email.sent[0].text).toContain("Hola, Persona Ficticia");

    const token = tokenFrom(email.sent[0].text);
    const check = await checkInvitation(db, token, now);
    expect(check).toEqual({ status: "ok", reference, firstName: "Persona", email: "persona.ficticia@example.com", expiresAt });
    expect((await latestInvitation(db, id))?.expiresAt.toISOString()).toBe(expiresAt.toISOString());

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, id));
    expect(logs.map((l) => l.action)).toContain("pre_admission.invited");
    expect(JSON.stringify(logs)).not.toContain(token);
  });

  it("a resend revokes the previous link", async () => {
    const { id } = await received();
    const first = new MemoryEmailSender();
    const second = new MemoryEmailSender();
    await inviteToAdmission(db, { email: first, baseURL }, adminId, id);
    await inviteToAdmission(db, { email: second, baseURL }, adminId, id);
    expect(await checkInvitation(db, tokenFrom(first.sent[0].text))).toEqual({ status: "invalid" });
    expect((await checkInvitation(db, tokenFrom(second.sent[0].text))).status).toBe("ok");
  });

  it("expired and made-up links are rejected", async () => {
    const { id } = await received();
    const email = new MemoryEmailSender();
    const now = new Date("2026-10-13T12:00:00Z");
    await inviteToAdmission(db, { email, baseURL }, adminId, id, now);
    expect(await checkInvitation(db, tokenFrom(email.sent[0].text), new Date("2026-10-21T00:00:00Z"))).toEqual({ status: "expired" });
    expect(await checkInvitation(db, "x".repeat(43))).toEqual({ status: "invalid" });
    expect(await checkInvitation(db, "<script>")).toEqual({ status: "invalid" });
  });

  it("a closed request cannot be invited, nor invited through the generic status change", async () => {
    const { id } = await received();
    await expect(changePreAdmissionStatus(db, adminId, id, "invitada")).rejects.toBeInstanceOf(InvalidTransitionError);
    await changePreAdmissionStatus(db, adminId, id, "cerrada", { reason: "Duplicada" });
    await expect(inviteToAdmission(db, { email: new MemoryEmailSender(), baseURL }, adminId, id)).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("closing an invited request invalidates its link", async () => {
    const { id } = await received();
    const email = new MemoryEmailSender();
    await inviteToAdmission(db, { email, baseURL }, adminId, id);
    await changePreAdmissionStatus(db, adminId, id, "cerrada", { reason: "No continúa con el proceso" });
    expect(await checkInvitation(db, tokenFrom(email.sent[0].text))).toEqual({ status: "invalid" });
  });
});
