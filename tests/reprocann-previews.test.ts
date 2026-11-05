// Thumbnails of REPROCANN documents: served with the same access rules as opening the file (its
// member and the admins), logged as a preview once a day per person and document (an opening is
// still logged every time), and kept out of the case history the admin reads on the member's page.
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditLogs, members, reprocannDocumentFiles } from "@/server/db/schema";
import { getReprocann } from "@/server/reprocann";
import { memberFolder, memberUploadInput, openDocumentFile, PREVIEW_ACTION, registerMemberUpload } from "@/server/reprocann-files";
import { LocalObjectStorage } from "@/server/storage/object-storage";
import { makeContext } from "./helpers/context";

let ctx: Awaited<ReturnType<typeof makeContext>>;
let storage: LocalObjectStorage;
let adminId: string;

beforeAll(async () => {
  ctx = await makeContext();
  storage = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-miniaturas-")));
  adminId = (await ctx.createAdmin("admin.miniaturas@example.com")).id;
});

async function memberWithFile(n: number) {
  const { userId, personId } = await ctx.createMember({ n: 900 + n, dni: `9909${String(n).padStart(4, "0")}`, password: "frase ficticia larga" });
  const [m] = await ctx.db.insert(members).values({ personId, userId, status: "activo", origin: "legacy" }).returning({ id: members.id });
  const key = memberFolder(m.id) + randomUUID();
  await storage.put(key, new TextEncoder().encode(`%PDF-1.7\n% credencial ficticia ${randomUUID()}\n%%EOF\n`), "application/pdf");
  const r = await registerMemberUpload(ctx.db, storage, { memberId: m.id, userId }, memberUploadInput.parse({ key, expiresOn: "2027-09-30" }));
  if (!r.ok) throw new Error(r.error);
  const [file] = await ctx.db.select().from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.documentId, r.documentId));
  return { memberId: m.id, userId, fileId: file.id, documentId: r.documentId };
}
const logsOf = (actor: string, action: string) => ctx.db.select().from(auditLogs).where(and(eq(auditLogs.actorUserId, actor), eq(auditLogs.action, action)));

describe("miniaturas de documentos REPROCANN", () => {
  it("are logged as a preview once a day per person and document; an opening, every time", async () => {
    const a = await memberWithFile(1);
    const admin = { role: "admin" as const, userId: adminId, memberId: a.memberId };
    for (let i = 0; i < 3; i++) expect(await openDocumentFile(ctx.db, storage, a.fileId, admin, { preview: true })).toBeTruthy();
    const [first] = await logsOf(adminId, PREVIEW_ACTION);
    expect(await logsOf(adminId, PREVIEW_ACTION)).toHaveLength(1);
    expect(first.metadata).toEqual({ document: a.documentId, by: "admin" });
    // A day later (the log is moved back 25 hours), one more; the member's own thumbnails count apart.
    await ctx.db.update(auditLogs).set({ at: new Date(Date.now() - 25 * 60 * 60 * 1000) }).where(eq(auditLogs.id, first.id));
    await openDocumentFile(ctx.db, storage, a.fileId, admin, { preview: true });
    expect(await logsOf(adminId, PREVIEW_ACTION)).toHaveLength(2);
    await openDocumentFile(ctx.db, storage, a.fileId, { role: "member", userId: a.userId, memberId: a.memberId }, { preview: true });
    expect(await logsOf(a.userId, PREVIEW_ACTION)).toHaveLength(1);

    const before = (await logsOf(adminId, "reprocann.document_viewed")).length;
    await openDocumentFile(ctx.db, storage, a.fileId, admin);
    await openDocumentFile(ctx.db, storage, a.fileId, admin);
    expect(await logsOf(adminId, "reprocann.document_viewed")).toHaveLength(before + 2);

    // The member's page shows what was done and opened, not every thumbnail.
    const history = (await getReprocann(ctx.db, ctx.rings.field, a.memberId))!.history.map((h) => h.action);
    expect(history).toContain("reprocann.document_viewed");
    expect(history).not.toContain(PREVIEW_ACTION);
  });

  it("follow the same rules as opening: nobody else's documents", async () => {
    const a = await memberWithFile(2);
    const b = await memberWithFile(3);
    expect(await openDocumentFile(ctx.db, storage, a.fileId, { role: "member", userId: b.userId, memberId: b.memberId }, { preview: true })).toBeNull();
    expect(await openDocumentFile(ctx.db, storage, a.fileId, { role: "admin", userId: adminId, memberId: b.memberId }, { preview: true })).toBeNull();
  });
});
