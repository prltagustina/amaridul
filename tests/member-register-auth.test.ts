// Real authorization of the member page's server actions: the actions are called as Next would
// call them, with the request's cookies, and requireAdmin() checks the session against Better
// Auth and the database. Only the request (headers) and the app singletons (database, auth,
// keys) are pointed at the test instance; nothing in the admin check is stubbed.
import { beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createOTP } from "@better-auth/utils/otp";
import { base32 } from "@better-auth/utils/base32";
import { members, persons, reprocannCases } from "@/server/db/schema";
import { readPersonDni } from "@/server/identity/person-identity";
import { cookiesFrom, makeContext } from "./helpers/context";

const request = vi.hoisted(() => ({ cookie: "" }));
const app = vi.hoisted(() => ({ ctx: null as null | Awaited<ReturnType<typeof import("./helpers/context").makeContext>> }));

vi.mock("next/headers", () => ({ headers: async () => new Headers(request.cookie ? { cookie: request.cookie } : {}) }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/server/db", () => ({ getDb: async () => app.ctx!.db }));
vi.mock("@/server/auth", () => ({ getAuth: async () => app.ctx!.auth }));
vi.mock("@/server/crypto", () => ({ getKeyrings: () => app.ctx!.rings }));

const actions = await import("@/app/admin/(panel)/socios/[id]/actions");
const reprocann = await import("@/app/admin/(panel)/socios/[id]/reprocann-actions");

let ctx: Awaited<ReturnType<typeof makeContext>>;
let memberId: string;
let personId: string;
let adminCookie = "";
let memberCookie = "";

beforeAll(async () => {
  ctx = await makeContext();
  app.ctx = ctx;

  // Target: a historical member imported without account, number or category.
  const [p] = await ctx.db.insert(persons).values({ fullName: "Persona Ficticia Destino", isFixture: true }).returning({ id: persons.id });
  personId = p.id;
  const [m] = await ctx.db.insert(members).values({ personId, origin: "legacy" }).returning({ id: members.id });
  memberId = m.id;

  // A member (non-admin) with a real session, signed in by DNI.
  await ctx.createMember({ n: 71, dni: "99007101", password: "socio-ficticio-123" });
  memberCookie = cookiesFrom(await ctx.post("/sign-in/dni", { dni: "99007101", password: "socio-ficticio-123" }));
  expect((await ctx.sessionOf(memberCookie)).user.role).toBe("MEMBER");

  // An admin with the second factor enrolled, as the panel requires.
  const admin = await ctx.createAdmin("admin.autorizacion@example.com");
  const first = cookiesFrom(await ctx.post("/sign-in/email", { email: admin.email, password: admin.password }));
  const enable = await (await ctx.post("/two-factor/enable", { password: admin.password }, first)).json();
  const secret = new TextDecoder().decode(base32.decode(new URL(enable.totpURI).searchParams.get("secret")!));
  await ctx.post("/two-factor/verify-totp", { code: await createOTP(secret).totp() }, first);
  const pending = cookiesFrom(await ctx.post("/sign-in/email", { email: admin.email, password: admin.password }));
  adminCookie = cookiesFrom(await ctx.post("/two-factor/verify-totp", { code: await createOTP(secret).totp() }, pending));
  expect((await ctx.sessionOf(adminCookie)).user.role).toBe("ADMIN");
});

/** The Next.js control-flow error requireAdmin throws (redirect to login, or 404 for non-admins). */
async function rejection(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    return String((e as { digest?: string }).digest ?? e);
  }
  return null;
}

const snapshot = async () => {
  const [m] = await ctx.db.select().from(members).where(eq(members.id, memberId));
  const [p] = await ctx.db.select().from(persons).where(eq(persons.id, personId));
  const [c] = await ctx.db.select().from(reprocannCases).where(eq(reprocannCases.memberId, memberId));
  return { m, p, c: c ?? null, dni: await readPersonDni(ctx.db, ctx.rings, personId) };
};

const EDITS = {
  "datos personales": () => actions.savePersonal(memberId, { firstNames: "Persona", lastNames: "Ficticia Editada", birthDate: "" }),
  contacto: () => actions.saveContact(memberId, { email: "persona.destino@example.com", phone: "", address: "", locality: "Localidad Ficticia", province: "", postalCode: "" }),
  membresía: () => actions.saveMembership(memberId, { category: "activo", since: "", status: "activo", minutesReference: "", room: "Sala Ficticia" }),
  DNI: () => actions.saveDni(memberId, "99007199"),
  "número de socio": () => actions.saveMemberNumber(memberId, "AUT-0001"),
  REPROCANN: () => reprocann.saveCaseAction(memberId, { permitStatus: "aprobado", managementSource: "association", responsibleName: "", linkageStatus: "pendiente" }),
} as const;

describe.each(Object.entries(EDITS))("editar %s", (_, edit) => {
  it("A. sin sesión → rechazado (al login) y nada cambia", async () => {
    const before = await snapshot();
    request.cookie = "";
    expect(await rejection(edit)).toMatch(/NEXT_REDIRECT.*\/admin\/login/);
    expect(await snapshot()).toEqual(before);
  });

  it("B. sesión de socio → rechazado (404) y nada cambia", async () => {
    const before = await snapshot();
    request.cookie = memberCookie;
    expect(await rejection(edit)).toMatch(/NEXT_HTTP_ERROR_FALLBACK;404/);
    expect(await snapshot()).toEqual(before);
  });

  it("C. admin → permitido", async () => {
    request.cookie = adminCookie;
    expect(await edit()).toMatchObject({ ok: true });
  });
});

describe("the admin's edits landed", () => {
  it("each block wrote to its owner", async () => {
    const { m, p, c, dni } = await snapshot();
    expect(p).toMatchObject({ lastNames: "Ficticia Editada", email: "persona.destino@example.com", locality: "Localidad Ficticia" });
    expect(m).toMatchObject({ category: "activo", room: "Sala Ficticia", memberNumber: "AUT-0001", userId: null });
    expect(dni).toBe("99007199");
    expect(c?.permitStatus).toBe("aprobado");
  });

  it("a forged admin cookie is not a session", async () => {
    request.cookie = "better-auth.session_token=forjada.firma";
    expect(await rejection(EDITS.contacto)).toMatch(/NEXT_REDIRECT.*\/admin\/login/);
  });
});
