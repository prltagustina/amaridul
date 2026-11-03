// The upload and file routes, as a browser meets them: who may send where, what is refused before
// storing anything, who may open a file and with which headers it is served. Sessions and storage
// are replaced by test doubles; the checks are the routes' own.
import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { members, reprocannDocumentFiles } from "@/server/db/schema";
import { LocalObjectStorage } from "@/server/storage/object-storage";
import { MAX_FILE_BYTES, memberFolder, memberUploadInput, registerMemberUpload } from "@/server/reprocann-files";
import { makeContext } from "./helpers/context";

type Who = { memberId: string; userId: string } | null;
const state = vi.hoisted(() => ({
  who: null as Who,
  admin: null as { id: string } | null,
  mode: "local" as "local" | "blob" | "unavailable",
  storage: null as unknown,
  db: null as unknown,
  blob: [] as { op: string; args: unknown[] }[],
}));

vi.mock("@/server/member-request", () => ({
  activeMemberOfRequest: async () => state.who,
  sameOrigin: (request: Request) => {
    const origin = request.headers.get("origin");
    return !origin || origin === new URL(request.url).origin;
  },
}));
vi.mock("@/server/storage", () => ({ uploadMode: () => state.mode, documentStorage: () => state.storage }));
vi.mock("@/server/db", () => ({ getDb: async () => state.db }));
vi.mock("@/server/auth/session", async () => {
  const { notFound } = await import("next/navigation");
  return { requireAdmin: async () => (state.admin ? { user: state.admin } : notFound()), getCurrentSession: async () => null };
});
vi.mock("@vercel/blob/client", () => ({
  handleUpload: async ({ body, onBeforeGenerateToken }: { body: { payload: { pathname: string } }; onBeforeGenerateToken: (p: string, c: null, m: boolean) => Promise<unknown> }) => ({
    type: "blob.generate-client-token",
    clientToken: JSON.stringify(await onBeforeGenerateToken(body.payload.pathname, null, false)),
  }),
}));
vi.mock("@vercel/blob", () => ({
  put: async (...args: unknown[]) => state.blob.push({ op: "put", args }),
  get: async (...args: unknown[]) => (state.blob.push({ op: "get", args }), null),
  del: async (...args: unknown[]) => state.blob.push({ op: "del", args }),
}));

const upload = await import("@/app/api/reprocann/subida/route");
const adminUpload = await import("@/app/admin/(panel)/reprocann/subida/route");
const memberFile = await import("@/app/qr/(socio)/reprocann/archivo/[id]/route");
const adminFile = await import("@/app/admin/(panel)/socios/[id]/reprocann/[file]/route");
const { PrivateBlobStorage } = await import("@/server/storage/private-blob-storage");

const SITE = "http://localhost:3000";
const PDF = new TextEncoder().encode("%PDF-1.7\n% credencial ficticia\n%%EOF\n");
let ctx: Awaited<ReturnType<typeof makeContext>>;
let storage: LocalObjectStorage;
let a: { memberId: string; userId: string };
let b: { memberId: string; userId: string };
let adminId: string;

async function memberWithAccount(i: number) {
  const { userId, personId } = await ctx.createMember({ n: 700 + i, dni: `9907000${i}`, password: "frase ficticia larga" });
  const [m] = await ctx.db.insert(members).values({ personId, userId, origin: "legacy", memberNumber: `RT-${i}` }).returning({ id: members.id });
  return { memberId: m.id, userId };
}

beforeAll(async () => {
  ctx = await makeContext();
  storage = new LocalObjectStorage(await mkdtemp(path.join(tmpdir(), "amaridul-routes-")));
  state.db = ctx.db;
  state.storage = storage;
  a = await memberWithAccount(1);
  b = await memberWithAccount(2);
  adminId = (await ctx.createAdmin("admin.rutas@example.com")).id;
});
beforeEach(() => {
  state.who = a;
  state.admin = null;
  state.mode = "local";
});

const put = (key: string, body: BodyInit | null, headers: Record<string, string> = {}) =>
  upload.PUT(new Request(`${SITE}/api/reprocann/subida?clave=${encodeURIComponent(key)}`, { method: "PUT", body, headers: { "content-type": "application/pdf", ...headers }, duplex: "half" } as RequestInit));
const own = () => memberFolder(a.memberId) + randomUUID();
const notFoundError = { digest: expect.stringContaining("404") };

describe("subida en la computadora de desarrollo", () => {
  it("stores the member's file in their own folder only", async () => {
    const key = own();
    expect((await put(key, PDF)).status).toBe(204);
    expect(await storage.get(key)).not.toBeNull();
    expect((await put(key, PDF)).status).toBe(409);
    expect((await put(memberFolder(b.memberId) + randomUUID(), PDF)).status).toBe(400);
    expect((await put("reprocann/../../.env.local", PDF)).status).toBe(400);
  });

  it("refuses without a member session, from another site, or on a deployment", async () => {
    state.who = null;
    expect((await put(own(), PDF)).status).toBe(404);
    state.who = a;
    expect((await put(own(), PDF, { origin: "https://otro-sitio.example" })).status).toBe(404);
    state.mode = "blob";
    expect((await put(own(), PDF)).status).toBe(404);
  });

  it("refuses other types and anything over 10 MB, even if the size is not declared", async () => {
    expect((await put(own(), PDF, { "content-type": "text/html" })).status).toBe(415);
    expect((await put(own(), PDF, { "content-length": String(MAX_FILE_BYTES + 1) })).status).toBe(413);
    const key = own();
    const big = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < 11; i++) c.enqueue(new Uint8Array(1024 * 1024));
        c.close();
      },
    });
    expect((await put(key, big)).status).toBe(413);
    expect(await storage.get(key)).toBeNull();
  });
});

describe("subida en un deploy (Blob privado)", () => {
  const ask = (pathname: string) => upload.POST(new Request(`${SITE}/api/reprocann/subida`, { method: "POST", body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname, clientPayload: null, multipart: false } }) }));

  it("grants a short permission for one file of up to 10 MB, of an accepted type, in the member's own folder", async () => {
    state.mode = "blob";
    const res = await ask(own());
    expect(res.status).toBe(200);
    const granted = JSON.parse((await res.json()).clientToken);
    expect(granted).toMatchObject({ allowedContentTypes: ["application/pdf", "image/jpeg", "image/png"], maximumSizeInBytes: MAX_FILE_BYTES, addRandomSuffix: false, allowOverwrite: false });
    expect(granted.validUntil - Date.now()).toBeLessThanOrEqual(10 * 60_000);
  });

  it("nothing for another member's folder, without a session, or while uploads are off", async () => {
    state.mode = "blob";
    expect((await ask(memberFolder(b.memberId) + randomUUID())).status).toBe(403);
    state.who = null;
    expect((await ask(own())).status).toBe(403);
    state.who = a;
    state.mode = "unavailable";
    expect((await ask(own())).status).toBe(404);
  });

  it("the server adapter always asks for private access and never overwrites", async () => {
    state.blob.length = 0;
    const blob = new PrivateBlobStorage();
    await blob.put("reprocann/x/y", PDF, "application/pdf");
    await blob.get("reprocann/x/y");
    expect(state.blob[0].args[2]).toMatchObject({ access: "private", addRandomSuffix: false, allowOverwrite: false, contentType: "application/pdf" });
    expect(state.blob[1].args[1]).toMatchObject({ access: "private" });
  });
});

describe("abrir un archivo", () => {
  let fileId: string;
  beforeAll(async () => {
    const key = memberFolder(a.memberId) + randomUUID();
    await storage.put(key, PDF, "application/pdf");
    const r = await registerMemberUpload(ctx.db, storage, a, memberUploadInput.parse({ key, expiresOn: "" }));
    if (!r.ok) throw new Error(r.error);
    [{ id: fileId }] = await ctx.db.select({ id: reprocannDocumentFiles.id }).from(reprocannDocumentFiles).where(eq(reprocannDocumentFiles.documentId, r.documentId));
  });
  const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

  it("the member gets their own file, privately: never cached, never sniffed, shown inline", async () => {
    const res = await memberFile.GET(new Request(`${SITE}/qr/reprocann/archivo/${fileId}`), params({ id: fileId }));
    expect(res.status).toBe(200);
    expect(Object.fromEntries(res.headers)).toMatchObject({
      "content-type": "application/pdf",
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "content-disposition": 'inline; filename="reprocann-credencial-hoja-1.pdf"',
    });
    expect(Buffer.from(await res.arrayBuffer()).equals(Buffer.from(PDF))).toBe(true);
  });

  it("another member, or nobody signed in, gets a not found", async () => {
    state.who = b;
    await expect(memberFile.GET(new Request(SITE), params({ id: fileId }))).rejects.toMatchObject(notFoundError);
    state.who = null;
    await expect(memberFile.GET(new Request(SITE), params({ id: fileId }))).rejects.toMatchObject(notFoundError);
  });

  it("an admin opens it from that member's page only", async () => {
    state.admin = { id: adminId };
    expect((await adminFile.GET(new Request(SITE), params({ id: a.memberId, file: fileId }))).status).toBe(200);
    await expect(adminFile.GET(new Request(SITE), params({ id: b.memberId, file: fileId }))).rejects.toMatchObject(notFoundError);
    state.admin = null;
    await expect(adminFile.GET(new Request(SITE), params({ id: a.memberId, file: fileId }))).rejects.toMatchObject(notFoundError);
  });
});

describe("subida de la asociación", () => {
  const putAdmin = (key: string, body: BodyInit) =>
    adminUpload.PUT(new Request(`${SITE}/admin/reprocann/subida?clave=${encodeURIComponent(key)}`, { method: "PUT", body, headers: { "content-type": "application/pdf" }, duplex: "half" } as RequestInit));

  it("only admins, and only into the folder of a member that exists", async () => {
    state.admin = null;
    await expect(putAdmin(memberFolder(a.memberId) + randomUUID(), PDF)).rejects.toMatchObject(notFoundError);
    state.admin = { id: adminId };
    expect((await putAdmin(memberFolder(a.memberId) + randomUUID(), PDF)).status).toBe(204);
    expect((await putAdmin(memberFolder(randomUUID()) + randomUUID(), PDF)).status).toBe(400);
    expect((await putAdmin("reprocann/../../.env.local", PDF)).status).toBe(400);
    state.mode = "blob";
    expect((await putAdmin(memberFolder(a.memberId) + randomUUID(), PDF)).status).toBe(404);
  });
});
