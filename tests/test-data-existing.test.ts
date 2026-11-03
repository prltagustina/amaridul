// The temporary test-deletion tool for «Ya soy socio/a» requests: it removes the request and what
// it created (member, account, person and DNI), never a member who was already on the register,
// and says why when it refuses.
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, existingMemberRequests, members, oneTimeTokens, personIdentities, persons, user } from "@/server/db/schema";
import { MemoryEmailSender } from "@/server/email/sender";
import { activateAccount } from "@/server/members";
import { existingMemberInput, institutionalInput, linkExistingMember, linkInput, registerExistingMember, submitExistingMemberRequest } from "@/server/existing-members";
import { DeleteNotAllowedError, deleteTestExistingMemberRequest } from "@/server/test-data";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
const baseURL = "https://amaridul.test";
const tokenIn = (text: string) => text.match(/#t=([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  ctx = await makeContext();
  adminId = (await ctx.createAdmin("admin.borrado.existentes@example.com")).id;
});

async function request(dni: string) {
  const r = await submitExistingMemberRequest(
    ctx.db,
    { rings: ctx.rings, email: new MemoryEmailSender() },
    existingMemberInput.parse({ nombres: "Persona", apellidos: "De Prueba", dni, email: `prueba.${dni}@example.com`, nacimiento: "", domicilio: "", localidad: "", provincia: "", cp: "", numeroSocio: "", privacidad: true, confirmacion: true }),
    null,
  );
  if (!r.ok) throw new Error("submit failed");
  const [row] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.reference, r.reference!));
  return row;
}
const deps = (mail = new MemoryEmailSender()) => ({ email: mail, baseURL, rings: ctx.rings });

describe("borrar una solicitud «Ya soy socio/a» de prueba", () => {
  it("removes the request, the member it registered with their activated account, and the person and DNI it created", async () => {
    const r = await request("99070001");
    const mail = new MemoryEmailSender();
    await registerExistingMember(ctx.db, deps(mail), adminId, r.id, institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "paciente", since: "", minutesReference: "", status: "activo" }));
    const [m] = await ctx.db.select().from(members).where(eq(members.id, (await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id)))[0].linkedMemberId!));
    await activateAccount(ctx.db, tokenIn(mail.sent.at(-1)!.text), "una frase larga y ficticia");

    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, r.id, "SOC-0000-0000")).rejects.toThrow(/no coincide/);
    const out = await deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference.toLowerCase());
    expect(out).toEqual({ reference: r.reference, memberNumber: m.memberNumber });

    expect(await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id))).toHaveLength(0);
    expect(await ctx.db.select().from(members).where(eq(members.id, m.id))).toHaveLength(0);
    expect(await ctx.db.select().from(user).where(eq(user.id, m.userId!))).toHaveLength(0);
    expect(await ctx.db.select().from(persons).where(eq(persons.id, m.personId))).toHaveLength(0);
    expect(await ctx.db.select().from(personIdentities).where(eq(personIdentities.personId, m.personId))).toHaveLength(0);
    expect(await ctx.db.select().from(oneTimeTokens).where(eq(oneTimeTokens.subjectId, r.id))).toHaveLength(0);
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "test_request.deleted"));
    expect(log).toMatchObject({ actorUserId: adminId, entityType: "existing_member_request", metadata: { reference: r.reference, memberNumber: m.memberNumber } });
    // The history stays, without pointing at the deleted account.
    expect((await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, r.id))).length).toBeGreaterThan(1);
    expect(await ctx.db.select().from(auditLogs).where(eq(auditLogs.actorUserId, m.userId!))).toHaveLength(0);
  });

  it("never deletes a member who was already on the register", async () => {
    const first = await request("99070002");
    await registerExistingMember(ctx.db, deps(), adminId, first.id, institutionalInput.parse({ numberMode: "next", memberNumber: "", category: "adherente", since: "", minutesReference: "", status: "activo" }));
    const [registered] = await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, first.id));
    const second = await request("99070002");
    await linkExistingMember(ctx.db, deps(), adminId, second.id, linkInput.parse({ category: "adherente", since: "", minutesReference: "", status: "activo" }));

    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, second.id, second.reference)).rejects.toThrow(/ya estaba en el padrón/);
    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, first.id, first.reference)).rejects.toThrow(/otras solicitudes vinculadas/);
    expect(await ctx.db.select().from(members).where(eq(members.id, registered.linkedMemberId!))).toHaveLength(1);
  });

  it("deletes a request nobody registered yet, and says why when it refuses", async () => {
    const r = await request("99070003");
    await deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference);
    expect(await ctx.db.select().from(existingMemberRequests).where(eq(existingMemberRequests.id, r.id))).toHaveLength(0);
    await expect(deleteTestExistingMemberRequest(ctx.db, adminId, r.id, r.reference)).rejects.toBeInstanceOf(DeleteNotAllowedError);
  });
});
