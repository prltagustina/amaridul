import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { openPglite, type Database } from "@/server/db/client";
import { auditLogs, persons, personIdentities } from "@/server/db/schema";
import { audit, ForbiddenAuditFieldError } from "@/server/audit/log";
import { nextReference } from "@/server/references";
import { consumeToken, findLiveToken, issueToken } from "@/server/tokens/one-time";
import { readPersonDni, setPersonDni } from "@/server/identity/person-identity";
import { freshRings } from "./helpers/context";

let db: Database;
beforeAll(async () => {
  db = await openPglite();
});

describe("person identity", () => {
  it("stores HMAC + ciphertext only, and decrypts for the right person", async () => {
    const rings = freshRings();
    const [p] = await db.insert(persons).values({ fullName: "Persona Ficticia", isFixture: true }).returning({ id: persons.id });
    await setPersonDni(db, rings, p.id, "99.000.010");
    const [row] = await db.select().from(personIdentities).where(eq(personIdentities.personId, p.id));
    expect(JSON.stringify(row)).not.toContain("99000010");
    expect(await readPersonDni(db, rings, p.id)).toBe("99000010");
  });

  it("a ciphertext copied onto another person does not decrypt", async () => {
    const rings = freshRings();
    const [a] = await db.insert(persons).values({ fullName: "A", isFixture: true }).returning({ id: persons.id });
    const [b] = await db.insert(persons).values({ fullName: "B", isFixture: true }).returning({ id: persons.id });
    await setPersonDni(db, rings, a.id, "99000011");
    await setPersonDni(db, rings, b.id, "99000012");
    const [ra] = await db.select().from(personIdentities).where(eq(personIdentities.personId, a.id));
    await db.update(personIdentities).set({ dniEncrypted: ra.dniEncrypted }).where(eq(personIdentities.personId, b.id));
    await expect(readPersonDni(db, rings, b.id)).rejects.toThrow();
  });
});

describe("references", () => {
  it("allocate sequentially per kind and year without duplicates under concurrency", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    expect(await nextReference(db, "pre_admission", "PRE", now)).toBe("PRE-2026-0001");
    const many = await Promise.all(Array.from({ length: 20 }, () => nextReference(db, "pre_admission", "PRE", now)));
    expect(new Set(many).size).toBe(20);
    expect(await nextReference(db, "pre_admission", "PRE", new Date("2027-01-01T00:00:00Z"))).toBe("PRE-2027-0001");
  });
});

describe("audit", () => {
  it("records entries and rejects sensitive metadata keys", async () => {
    await audit(db, { action: "test.action", entityType: "thing", entityId: "1", metadata: { from: "a", to: "b" } });
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.action, "test.action"));
    expect(rows).toHaveLength(1);
    for (const key of ["password", "resetToken", "totpSecret", "dni", "backupCode"]) {
      await expect(audit(db, { action: "x", entityType: "y", metadata: { [key]: "v" } })).rejects.toThrow(ForbiddenAuditFieldError);
    }
  });
});

describe("one-time tokens", () => {
  it("are single-use, expire, and are revoked on resend", async () => {
    const t0 = new Date("2026-10-10T12:00:00Z");
    const first = await issueToken(db, { kind: "activation", subjectId: "s1", ttlMs: 60_000 }, t0);
    expect(await findLiveToken(db, "activation", first.token, t0)).not.toBeNull();
    const second = await issueToken(db, { kind: "activation", subjectId: "s1", ttlMs: 60_000, revokePrevious: true }, t0);
    expect(await consumeToken(db, "activation", first.token, t0)).toBeNull();
    expect(await consumeToken(db, "other-kind", second.token, t0)).toBeNull();
    expect(await consumeToken(db, "activation", second.token, t0)).not.toBeNull();
    expect(await consumeToken(db, "activation", second.token, t0)).toBeNull();

    const late = await issueToken(db, { kind: "activation", subjectId: "s2", ttlMs: 60_000 }, t0);
    expect(await consumeToken(db, "activation", late.token, new Date(t0.getTime() + 61_000))).toBeNull();
  });

  it("concurrent consumption succeeds exactly once", async () => {
    const t = await issueToken(db, { kind: "activation", subjectId: "s3", ttlMs: 60_000 });
    const results = await Promise.all(Array.from({ length: 5 }, () => consumeToken(db, "activation", t.token)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
