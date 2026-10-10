import { randomBytes } from "node:crypto";
import { openPglite, type Database } from "@/server/db/client";
import { account, persons, user } from "@/server/db/schema";
import { parseKeyring } from "@/server/crypto/keyring";
import { MemoryEmailSender } from "@/server/email/sender";
import { createAuth } from "@/server/auth/create-auth";
import { createAdminAccount } from "@/server/auth/admin-accounts";
import { hashPassword } from "@/server/auth/password";
import { setPersonDni, type Keyrings } from "@/server/identity/person-identity";

export const BASE = "https://amaridul.test";
export const b64key = () => randomBytes(32).toString("base64");
export const freshRings = (): Keyrings => ({
  field: parseKeyring(`v1:${b64key()}`, "v1"),
  lookup: parseKeyring(`v1:${b64key()}`, "v1"),
});

export async function makeContext(opts: { rateLimit?: boolean; rings?: Keyrings; db?: Database } = {}) {
  const db = opts.db ?? (await openPglite());
  const rings = opts.rings ?? freshRings();
  const email = new MemoryEmailSender();
  const auth = createAuth({
    db,
    baseURL: BASE,
    secret: b64key(),
    lookupRing: rings.lookup,
    email,
    withNextCookies: false,
    rateLimit: opts.rateLimit ?? false,
  });

  const request = (method: "GET" | "POST", path: string, body?: unknown, cookie?: string, ip = "203.0.113.10") =>
    auth.handler(
      new Request(`${BASE}/api/auth${path}`, {
        method,
        headers: {
          origin: BASE,
          "x-forwarded-for": ip,
          ...(body ? { "content-type": "application/json" } : {}),
          ...(cookie ? { cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
  const post = (path: string, body: unknown, cookie?: string, ip?: string) => request("POST", path, body, cookie, ip);
  const get = (path: string, cookie?: string) => request("GET", path, undefined, cookie);
  const sessionOf = async (cookie: string) => (await get("/get-session", cookie)).json();

  async function createMember(o: { n: number; dni: string; password: string; status?: "active" | "pending_activation" | "disabled" }) {
    const emailAddr = `socio.test${o.n}@example.com`;
    const [person] = await db.insert(persons).values({ fullName: `Persona Ficticia ${o.n}`, email: emailAddr, isFixture: true }).returning({ id: persons.id });
    await setPersonDni(db, rings, person.id, o.dni);
    const [u] = await db
      .insert(user)
      .values({ name: `Persona Ficticia ${o.n}`, email: emailAddr, role: "MEMBER", status: o.status ?? "active", personId: person.id })
      .returning({ id: user.id });
    await db.insert(account).values({ userId: u.id, accountId: u.id, providerId: "credential", password: await hashPassword(o.password) });
    return { userId: u.id, personId: person.id, email: emailAddr };
  }

  async function createAdmin(emailAddr = "admin.local@example.com", password = "admin-ficticio-123") {
    const id = await createAdminAccount(db, { email: emailAddr, name: "Admin Local", password, appEnv: "test" });
    return { id, email: emailAddr, password };
  }

  return { db, rings, email, auth, post, get, sessionOf, createMember, createAdmin };
}

export const cookiesFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
