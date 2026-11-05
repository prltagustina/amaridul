// Withdrawing a duplicate credential: it leaves the active documentation without being deleted
// (files and review stay, with who withdrew it, when, why and what was kept), the credential in
// force is recomputed everywhere, the member is never left without the one kept, and the review
// keeps its rules (no review of a withdrawn document, a verified credential carries its expiry).
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { auditLogs, members, reprocannDocumentFiles, reprocannDocuments } from "@/server/db/schema";
import { caseInput, getReprocann, ReprocannError, reviewDocument, reviewInput, saveCase, withdrawDuplicate, withdrawNotThisMember } from "@/server/reprocann";
import { addAdminDocument, adminUploadInput, documentsToReview, memberFolder, memberUploadInput, openDocumentFile, previewImport, registerMemberUpload, sha256Hex } from "@/server/reprocann-files";
import { memberReprocann } from "@/server/member-portal";
import { getMemberProfile, listRegister } from "@/server/member-profile";
import { setLinkCode } from "@/server/reprocann-link";
import { dispensingEligibility } from "@/lib/dispensing";
import { LocalObjectStorage } from "@/server/storage/object-storage";
import { makeContext } from "./helpers/context";

const pdf = () => new TextEncoder().encode(`%PDF-1.7\n% credencial ficticia ${randomUUID()}\n%%EOF\n`);

let ctx: Awaited<ReturnType<typeof makeContext>>;
let storage: LocalObjectStorage;
let adminId: string;
let n = 0;

beforeAll(async () => {
  ctx = await makeContext();
  storage = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-retiro-")));
  adminId = (await ctx.createAdmin("admin.retiro@example.com")).id;
});

async function memberWithAccount() {
  n += 1;
  const dni = `9908${String(n).padStart(4, "0")}`;
  const { userId, personId } = await ctx.createMember({ n: 800 + n, dni, password: "frase ficticia larga" });
  const [m] = await ctx.db.insert(members).values({ personId, userId, status: "activo", origin: "legacy", memberNumber: `W-${String(n).padStart(3, "0")}` }).returning({ id: members.id });
  return { memberId: m.id, userId, dni };
}
async function stored(memberId: string, bytes: Uint8Array) {
  const key = memberFolder(memberId) + randomUUID();
  await storage.put(key, bytes, "application/pdf");
  return key;
}
/** The association loads a credential it received, and verifies it. */
async function verifiedByAssociation(who: { memberId: string; dni: string }, expiresOn = "2027-09-30", at = new Date("2026-11-01T12:00:00Z")) {
  const r = await addAdminDocument(ctx.db, storage, ctx.rings, adminId, who.memberId, adminUploadInput.parse({ target: "nuevo", kind: "credencial", expiresOn: "", dni: who.dni, pages: [await stored(who.memberId, pdf())] }), at);
  if (!r.ok) throw new Error(r.error);
  await reviewDocument(ctx.db, ctx.rings.field, adminId, r.documentId, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-01", expiresOn }), at);
  return r.documentId;
}
/** The member sends the same credential again from their account (it stays pending). */
async function sentByMember(who: { memberId: string; userId: string }, at = new Date("2026-11-03T12:00:00Z")) {
  const r = await registerMemberUpload(ctx.db, storage, who, memberUploadInput.parse({ key: await stored(who.memberId, pdf()), expiresOn: "2027-09-30" }), at);
  if (!r.ok) throw new Error(r.error);
  return r.documentId;
}
const statusOf = async (memberId: string) => (await memberReprocann(ctx.db, ctx.rings.field, memberId))!.status;

describe("retirar una credencial duplicada", () => {
  it("withdraws the repeated one, keeps the other, and the credential in force is recomputed everywhere", async () => {
    const a = await memberWithAccount();
    const kept = await verifiedByAssociation(a);
    const repeated = await sentByMember(a);
    // Two active credentials: the newest counts, so the member reads «En revisión» despite the verified one.
    expect((await statusOf(a.memberId)).key).toBe("pending");
    expect((await documentsToReview(ctx.db)).map((d) => d.id)).toContain(repeated);

    const r = await withdrawDuplicate(ctx.db, adminId, repeated, kept, new Date("2026-11-04T13:00:00Z"));
    expect(r.currentAfter).toBe(kept);

    // Nothing deleted: the row, its file and its review stay, marked with who, when, why and what was kept.
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, repeated));
    expect(row).toMatchObject({ withdrawnBy: adminId, withdrawalReason: "duplicado", keptDocumentId: kept, reviewStatus: "pendiente" });
    expect(row.withdrawnAt).toEqual(new Date("2026-11-04T13:00:00Z"));
    const files = await ctx.db.select().from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.documentId, repeated));
    expect(files).toHaveLength(1);
    expect(await storage.get(files[0].fileKey)).toBeTruthy();

    // The member's space, the register and the admin's page agree: the verified one is in force.
    const portal = (await memberReprocann(ctx.db, ctx.rings.field, a.memberId))!;
    expect(portal.status.key).toBe("verified");
    expect(portal.credential!.id).toBe(kept);
    const shown = portal.documents.find((d) => d.id === repeated)!;
    expect(shown).toMatchObject({ withdrawn: "duplicado", files: [] });
    expect((await listRegister(ctx.db)).find((m) => m.id === a.memberId)!.credential.key).toBe("verified");
    expect((await getMemberProfile(ctx.db, ctx.rings, a.memberId))!.credentialStatus.key).toBe("verified");
    // It leaves the review queue; it cannot be reviewed any more.
    expect((await documentsToReview(ctx.db)).map((d) => d.id)).not.toContain(repeated);
    await expect(reviewDocument(ctx.db, ctx.rings.field, adminId, repeated, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-04", expiresOn: "2027-09-30" }))).rejects.toBeInstanceOf(ReprocannError);

    // The member no longer opens it; the association still can, for the record.
    expect(await openDocumentFile(ctx.db, storage, files[0].id, { role: "member", userId: a.userId, memberId: a.memberId })).toBeNull();
    expect(await openDocumentFile(ctx.db, storage, files[0].id, { role: "admin", userId: adminId, memberId: a.memberId })).toBeTruthy();

    // The log says what was withdrawn, what was kept and how the status changed.
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_withdrawn"));
    expect(log.metadata).toMatchObject({ document: repeated, kept, reason: "duplicado", current_before: repeated, current_after: kept, status_before: "pending", status_after: "verified" });
    // The admin's page names who withdrew it.
    const doc = (await getReprocann(ctx.db, ctx.rings.field, a.memberId))!.documents.find((d) => d.id === repeated)!;
    expect(doc.withdrawnByName).toBeTruthy();
  });

  it("never leaves the member without the document kept, nor touches inactive or foreign documents", async () => {
    const a = await memberWithAccount();
    const kept = await verifiedByAssociation(a);
    const repeated = await sentByMember(a);
    const other = await memberWithAccount();
    const foreign = await verifiedByAssociation(other);

    for (const [doc, keep] of [
      [repeated, repeated], // itself
      [repeated, foreign], // a document of another member
      [repeated, randomUUID()], // nothing
      ["no-es-un-id", kept],
    ] as const)
      await expect(withdrawDuplicate(ctx.db, adminId, doc, keep)).rejects.toBeInstanceOf(ReprocannError);

    await withdrawDuplicate(ctx.db, adminId, repeated, kept);
    // Already withdrawn, or keeping a withdrawn one: refused. The kept one is never withdrawn by keeping another.
    await expect(withdrawDuplicate(ctx.db, adminId, repeated, kept)).rejects.toThrow(/ya se retiró/);
    await expect(withdrawDuplicate(ctx.db, adminId, kept, repeated)).rejects.toThrow(/ya no está activo/);
    expect((await statusOf(a.memberId)).key).toBe("verified");
  });

  it("a document replaced by the member is history, not a duplicate", async () => {
    const a = await memberWithAccount();
    const first = await sentByMember(a, new Date("2026-11-02T12:00:00Z"));
    const second = await sentByMember(a, new Date("2026-11-03T12:00:00Z"));
    await expect(withdrawDuplicate(ctx.db, adminId, first, second)).rejects.toThrow(/reemplazado/);
  });

  it("withdrawing the one that supports the verification says so: the status changes and so does the enablement", async () => {
    const a = await memberWithAccount();
    const pending = await sentByMember(a, new Date("2026-10-30T12:00:00Z"));
    const verified = await verifiedByAssociation(a, "2027-09-30", new Date("2026-11-02T12:00:00Z"));
    await setLinkCode(ctx.db, ctx.rings.field, a.userId, a.memberId, "QA12FIC34");
    await saveCase(ctx.db, adminId, a.memberId, caseInput.parse({ permitStatus: "aprobado", managementSource: "association", responsibleName: "", linkageStatus: "verificada" }));
    const enabled = async () => dispensingEligibility({ membership: "activo", credential: await statusOf(a.memberId), linkage: { verified: true, codeReceived: true } }).eligible;
    expect(await enabled()).toBe(true);

    // The admin keeps the pending one: the verified credential stops counting, explicitly.
    await withdrawDuplicate(ctx.db, adminId, verified, pending);
    expect((await statusOf(a.memberId)).key).toBe("pending");
    expect(await enabled()).toBe(false);
    const logs = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_withdrawn"));
    expect(logs.at(-1)!.metadata).toMatchObject({ status_before: "verified", status_after: "pending", current_after: pending });
  });

  it("the import and the member's next upload ignore a withdrawn duplicate", async () => {
    const a = await memberWithAccount();
    const kept = await verifiedByAssociation(a);
    const repeated = await sentByMember(a);
    await withdrawDuplicate(ctx.db, adminId, repeated, kept);
    // A new upload does not «replace» the withdrawn one (it stays withdrawn, not replaced).
    const renewal = await sentByMember(a, new Date("2026-11-05T12:00:00Z"));
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, repeated));
    expect(row.replacedBy).toBeNull();
    expect((await memberReprocann(ctx.db, ctx.rings.field, a.memberId))!.credential!.id).toBe(renewal);
    // The import still sees the member's active credential with a file: «Ya existe».
    const bytes = pdf();
    const preview = await previewImport(ctx.db, ctx.rings, [{ dni: a.dni, page: 1, sha256: sha256Hex(bytes), size: bytes.byteLength, type: "application/pdf" }]);
    expect(preview[0].status).toBe("existente");
  });
});

describe("retirar un documento que no es del socio", () => {
  it("withdraws it even when it is the only one, keeps nothing instead, and leaves the other person's account alone", async () => {
    const a = await memberWithAccount();
    const other = await memberWithAccount();
    // The other person's credential, in their own account, and a copy sent to the wrong account.
    const theirs = await verifiedByAssociation(other);
    const wrong = await sentByMember(a);
    expect((await statusOf(a.memberId)).key).toBe("pending");

    const r = await withdrawNotThisMember(ctx.db, adminId, wrong, new Date("2026-11-05T13:00:00Z"));
    expect(r.currentAfter).toBeNull();

    // Nothing deleted: the row and its file stay, marked with who, when and why, and nothing kept.
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, wrong));
    expect(row).toMatchObject({ withdrawnBy: adminId, withdrawalReason: "otro_socio", keptDocumentId: null });
    const files = await ctx.db.select().from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.documentId, wrong));
    expect(files).toHaveLength(1);
    expect(await storage.get(files[0].fileKey)).toBeTruthy();

    // This member is left without a credential and reads it as not theirs, without its files or expiry.
    const portal = (await memberReprocann(ctx.db, ctx.rings.field, a.memberId))!;
    expect(portal.status.key).toBe("none");
    expect(portal.documents.find((d) => d.id === wrong)).toMatchObject({ withdrawn: "otro_socio", files: [], expiresOn: null });
    expect(await openDocumentFile(ctx.db, storage, files[0].id, { role: "member", userId: a.userId, memberId: a.memberId })).toBeNull();
    expect(await openDocumentFile(ctx.db, storage, files[0].id, { role: "admin", userId: adminId, memberId: a.memberId })).toBeTruthy();
    expect((await documentsToReview(ctx.db)).map((d) => d.id)).not.toContain(wrong);

    // The other person's credential is untouched.
    expect((await statusOf(other.memberId)).key).toBe("verified");
    const [kept] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, theirs));
    expect(kept.withdrawnAt).toBeNull();

    // The log says what was withdrawn and how the status changed.
    const [log] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "reprocann.document_withdrawn_other_member"));
    expect(log.metadata).toMatchObject({ document: wrong, reason: "otro_socio", current_before: wrong, current_after: null, status_before: "pending", status_after: "none" });

    // Once, and no review afterwards.
    await expect(withdrawNotThisMember(ctx.db, adminId, wrong)).rejects.toThrow(/ya se retiró/);
    await expect(reviewDocument(ctx.db, ctx.rings.field, adminId, wrong, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-05", expiresOn: "2027-09-30" }))).rejects.toThrow(/se retiró/);
  });

  it("the database keeps the rule: a duplicate names the document kept, the other reason none", async () => {
    const a = await memberWithAccount();
    const one = await verifiedByAssociation(a);
    const two = await sentByMember(a);
    const at = new Date("2026-11-05T14:00:00Z");
    await expect(ctx.db.update(reprocannDocuments).set({ withdrawnAt: at, withdrawnBy: adminId, withdrawalReason: "otro_socio", keptDocumentId: one }).where(eq(reprocannDocuments.id, two))).rejects.toThrow();
    await expect(ctx.db.update(reprocannDocuments).set({ withdrawnAt: at, withdrawnBy: adminId, withdrawalReason: "duplicado", keptDocumentId: null }).where(eq(reprocannDocuments.id, two))).rejects.toThrow();
    await expect(ctx.db.update(reprocannDocuments).set({ withdrawnAt: at, withdrawnBy: adminId, withdrawalReason: null, keptDocumentId: null }).where(eq(reprocannDocuments.id, two))).rejects.toThrow();
    const [row] = await ctx.db.select().from(reprocannDocuments).where(eq(reprocannDocuments.id, two));
    expect(row.withdrawnAt).toBeNull();
  });
});

describe("la revisión de una credencial", () => {
  it("is verified with the expiry read on it and a date that is not in the future", async () => {
    const a = await memberWithAccount();
    const doc = await sentByMember(a);
    await ctx.db.update(reprocannDocuments).set({ expiresOn: null }).where(eq(reprocannDocuments.id, doc));
    await expect(reviewDocument(ctx.db, ctx.rings.field, adminId, doc, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-04" }))).rejects.toThrow(/vencimiento/);
    await expect(reviewDocument(ctx.db, ctx.rings.field, adminId, doc, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2999-01-01", expiresOn: "2027-09-30" }))).rejects.toThrow(/posterior a hoy/);
    await reviewDocument(ctx.db, ctx.rings.field, adminId, doc, reviewInput.parse({ reviewStatus: "verificada", verifiedOn: "2026-11-04", expiresOn: "2027-09-30" }), new Date("2026-11-04T15:00:00Z"));
    const r = (await getReprocann(ctx.db, ctx.rings.field, a.memberId))!.documents.find((d) => d.id === doc)!;
    // Who reviewed and when stay with the document.
    expect(r).toMatchObject({ reviewStatus: "verificada", verifiedOn: "2026-11-04", expiresOn: "2027-09-30", reviewedBy: adminId });
    expect(r.reviewedByName).toBeTruthy();
    expect((await statusOf(a.memberId)).key).toBe("verified");
  });
});
