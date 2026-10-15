import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openPglite, type Database } from "@/server/db/client";
import { admissions, auditLogs, personIdentities, persons, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { admissionInput, countAdmissions, elevateToCommission, getAdmission, InvalidAdmissionTransitionError, listAdmissions, submitAdmission } from "@/server/admissions";
import { checkInvitation, createPreAdmission, formalAdmissionOf, InvalidTransitionError, inviteToAdmission, preAdmissionInput } from "@/server/pre-admissions";
import { freshRings } from "./helpers/context";

const pre = {
  nombre: "Persona Ficticia",
  email: "persona.ficticia@example.com",
  provincia: "Santa Fe",
  localidad: "Localidad Ficticia",
  intereses: ["comunidad"],
  reprocann: "",
  participacion: "si",
  privacidad: true,
};

const formal = (dni: string, patch: Record<string, unknown> = {}) => ({
  nombres: "Persona",
  apellidos: "Ficticia",
  dni,
  nacimiento: "1990-05-12",
  nacionalidad: "Argentina",
  domicilio: "Calle Ficticia 123",
  localidad: "Localidad Ficticia",
  provincia: "Santa Fe",
  cp: "2000",
  email: "persona.ficticia@example.com",
  telefono: "+54 9 000 000-0001",
  emailNotificaciones: "",
  categoria: "paciente",
  interes: "Busco acompañamiento por un tratamiento.",
  obligaciones: true,
  pacienteAcompanamiento: true,
  pacienteReprocann: "en-tramite",
  pacienteInformado: true,
  estatuto: true,
  cuota: true,
  veracidad: true,
  cambios: true,
  datos: true,
  novedades: false,
  confirmacion: true,
  ...patch,
});

let db: Database;
let adminId: string;
const rings = freshRings();
beforeAll(async () => {
  db = await openPglite();
  const [u] = await db.insert(user).values({ name: "Admin Ficticio", email: "admin.adm@example.com", role: "ADMIN", status: "active" }).returning({ id: user.id });
  adminId = u.id;
});

/** A received preadmission, invited; returns the link token. */
async function invited(): Promise<string> {
  const { id } = await createPreAdmission(db, { field: rings.field, email: new MemoryEmailSender() }, preAdmissionInput.parse(pre));
  const mail = new MemoryEmailSender();
  await inviteToAdmission(db, { email: mail, baseURL: "https://amaridul.test" }, adminId, id);
  return mail.sent[0].text.match(/#t=([A-Za-z0-9_-]+)/)![1];
}

describe("formal admission input", () => {
  it("accepts the wizard and requires the patient answers only for that category", () => {
    expect(admissionInput.safeParse(formal("99000101")).success).toBe(true);
    expect(admissionInput.safeParse(formal("99000101", { pacienteReprocann: "" })).success).toBe(false);
    expect(admissionInput.safeParse(formal("99000101", { categoria: "adherente", pacienteReprocann: "", pacienteInformado: false })).success).toBe(true);
  });

  it.each([
    ["short DNI", { dni: "123" }],
    ["future birth date", { nacimiento: "2999-01-01" }],
    ["statute not accepted", { estatuto: false }],
    ["unknown category", { categoria: "honorario" }],
    ["bad notification email", { emailNotificaciones: "no-es-email" }],
  ])("rejects %s", (_, patch) => {
    expect(admissionInput.safeParse(formal("99000101", patch)).success).toBe(false);
  });
});

describe("formal admission", () => {
  it("stores the request once, consumes the link and keeps DNI and health data encrypted", async () => {
    const token = await invited();
    const mail = new MemoryEmailSender();
    const r = await submitAdmission(db, { rings, email: mail }, token, admissionInput.parse(formal("99.000.102")));
    expect(r).toMatchObject({ ok: true });
    const reference = (r as { reference: string }).reference;
    expect(reference).toMatch(/^ADM-\d{4}-\d{4}$/);

    expect(await checkInvitation(db, token)).toEqual({ status: "invalid" });
    expect(await submitAdmission(db, { rings, email: new MemoryEmailSender() }, token, admissionInput.parse(formal("99000103")))).toEqual({ ok: false, error: "invalid_link" });

    const [row] = await db.select().from(admissions).where(eq(admissions.reference, reference));
    expect(row.healthEncrypted).not.toContain("tratamiento");
    expect(row.healthEncrypted).not.toContain("en-tramite");
    const [identity] = await db.select().from(personIdentities).where(eq(personIdentities.personId, row.personId));
    expect(JSON.stringify(identity)).not.toContain("99000102");
    expect(identity.birthDate).toBe("1990-05-12");
    const [person] = await db.select().from(persons).where(eq(persons.id, row.personId));
    expect(person.fullName).toBe("Persona Ficticia");

    const detail = await getAdmission(db, rings, row.id);
    expect(detail?.dniMasked).toBe("**.***.102");
    expect(detail?.interest).toContain("tratamiento");
    expect(detail?.patient?.reprocann).toBe("En trámite");
    expect(detail?.status).toBe("recibida");

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entityId, row.id));
    expect(JSON.stringify(logs)).not.toMatch(/99000102|tratamiento/);

    expect(mail.sent[0].subject).toContain(reference);
    expect(mail.sent[0].to).toBe("persona.ficticia@example.com");
  });

  it("once the formal request is in, the preadmission cannot be invited again", async () => {
    const { id: preId } = await createPreAdmission(db, { field: rings.field, email: new MemoryEmailSender() }, preAdmissionInput.parse(pre));
    const mail = new MemoryEmailSender();
    await inviteToAdmission(db, { email: mail, baseURL: "https://amaridul.test" }, adminId, preId);
    const token = mail.sent[0].text.match(/#t=([A-Za-z0-9_-]+)/)![1];
    const r = await submitAdmission(db, { rings, email: new MemoryEmailSender() }, token, admissionInput.parse(formal("99000108")));

    expect((await formalAdmissionOf(db, preId))?.reference).toBe((r as { reference: string }).reference);
    await expect(inviteToAdmission(db, { email: new MemoryEmailSender(), baseURL: "https://amaridul.test" }, adminId, preId)).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("does not load a DNI that is already on file", async () => {
    await submitAdmission(db, { rings, email: new MemoryEmailSender() }, await invited(), admissionInput.parse(formal("99000104")));
    const token = await invited();
    expect(await submitAdmission(db, { rings, email: new MemoryEmailSender() }, token, admissionInput.parse(formal("99.000.104")))).toEqual({ ok: false, error: "dni_registered" });
    // The link is still usable to fix the DNI.
    expect((await checkInvitation(db, token)).status).toBe("ok");
  });

  it("rejects made-up links and sends confirmation to the notification email when given", async () => {
    expect(await submitAdmission(db, { rings, email: new MemoryEmailSender() }, "x".repeat(43), admissionInput.parse(formal("99000105")))).toEqual({ ok: false, error: "invalid_link" });
    const mail = new MemoryEmailSender();
    await submitAdmission(db, { rings, email: mail }, await invited(), admissionInput.parse(formal("99000106", { emailNotificaciones: "avisos@example.com", categoria: "adherente", pacienteReprocann: "" })));
    expect(mail.sent[0].to).toBe("avisos@example.com");
  });

  it("is elevated to the Comisión Directiva once", async () => {
    await submitAdmission(db, { rings, email: new MemoryEmailSender() }, await invited(), admissionInput.parse(formal("99000107")));
    const [row] = await listAdmissions(db);
    const before = await countAdmissions(db, ["recibida"]);
    await elevateToCommission(db, adminId, row.id);
    expect(await countAdmissions(db, ["recibida"])).toBe(before - 1);
    expect((await getAdmission(db, rings, row.id))?.status).toBe("comision");
    await expect(elevateToCommission(db, adminId, row.id)).rejects.toBeInstanceOf(InvalidAdmissionTransitionError);
  });
});
