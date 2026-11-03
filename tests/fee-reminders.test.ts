// The fee reminder: off until both the deployment and an admin allow it; one general email per
// member and period, whatever happens (retries, a crash halfway, two runs at once); a registry of
// who, which period and what result; never an amount, a debt or a due date. No real emails.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { auditLogs, feeReminderSends, members, persons } from "@/server/db/schema";
import { EmailDeliveryError, MemoryEmailSender, type EmailMessage } from "@/server/email/sender";
import { makeContext } from "./helpers/context";

const state = vi.hoisted(() => ({ db: null as unknown, sender: null as unknown }));
vi.mock("@/server/db", () => ({ getDb: async () => state.db }));
vi.mock("@/server/email", () => ({ getEmailSender: () => state.sender }));
vi.mock("@/server/env", () => ({ getEnv: () => ({ BETTER_AUTH_URL: "http://localhost:3000" }) }));

const { getReminderSettings, MAX_ATTEMPTS, periodOf, ReminderError, reminderAudience, runFeeReminders, saveReminderSettings, schedule } = await import("@/server/fee-reminders");
const cron = await import("@/app/api/cron/recordatorio-cuota/route");

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
let n = 0;
const BASE = { baseURL: "http://localhost:3000" };
const NOV = new Date("2026-11-15T15:00:00Z"); // 15/11/2026 12:00 in Argentina

/** A member with a person record; `email: null` means none registered. */
async function member(o: { email?: string | null; status?: "activo" | "suspendido" | "baja" } = {}) {
  n += 1;
  const email = o.email === undefined ? `socio.cuota${n}@example.com` : o.email;
  const [p] = await ctx.db.insert(persons).values({ fullName: `Persona Cuota ${n}`, firstNames: `Persona${n}`, lastNames: "Ficticia", email, isFixture: true }).returning({ id: persons.id });
  const [m] = await ctx.db.insert(members).values({ personId: p.id, status: o.status ?? "activo", origin: "legacy" }).returning({ id: members.id });
  return m.id;
}
const rows = (period: string) => ctx.db.select().from(feeReminderSends).where(eq(feeReminderSends.period, period));
const on = async (frequency: "mensual" | "trimestral" = "mensual", dayOfMonth = 1, hour = 0) => {
  vi.stubEnv("FEE_REMINDERS", "on");
  await saveReminderSettings(ctx.db, adminId, { enabled: true, frequency, dayOfMonth, hour });
};

beforeAll(async () => {
  ctx = await makeContext();
  state.db = ctx.db;
  adminId = (await ctx.createAdmin("admin.cuota@example.com")).id;
});
beforeEach(async () => {
  await ctx.db.delete(feeReminderSends);
  await ctx.db.update(members).set({ status: "baja" });
});
afterEach(() => vi.unstubAllEnvs());

describe("apagado por defecto", () => {
  it("starts off, and cannot be turned on while the deployment does not allow sending", async () => {
    expect(await getReminderSettings(ctx.db)).toMatchObject({ enabled: false, frequency: "trimestral", dayOfMonth: 10, hour: 10 });
    await member();
    const email = new MemoryEmailSender();
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, NOV)).toMatchObject({ status: "desactivado", sent: 0 });
    await expect(saveReminderSettings(ctx.db, adminId, { enabled: true, frequency: "mensual", dayOfMonth: 5, hour: 9 })).rejects.toBeInstanceOf(ReminderError);
    // Configured but not on: still nothing.
    await saveReminderSettings(ctx.db, adminId, { enabled: false, frequency: "mensual", dayOfMonth: 5, hour: 9 });
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, NOV)).toMatchObject({ status: "desactivado" });
    // Allowed by the deployment but off in the admin: nothing either.
    vi.stubEnv("FEE_REMINDERS", "on");
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, NOV)).toMatchObject({ status: "desactivado" });
    expect(email.sent).toHaveLength(0);
    expect(await ctx.db.select().from(feeReminderSends)).toHaveLength(0);
  });
});

describe("cuándo, en hora de Argentina", () => {
  it("names the period by Argentina's calendar, across midnight and quarters", () => {
    expect(periodOf("mensual", new Date("2026-12-01T02:30:00Z"))).toBe("2026-11"); // 30/11 23:30 in Argentina
    expect(periodOf("mensual", new Date("2026-12-01T03:00:00Z"))).toBe("2026-12");
    expect(periodOf("trimestral", new Date("2026-10-01T02:59:00Z"))).toBe("2026-T3");
    expect(periodOf("trimestral", new Date("2026-10-01T03:00:00Z"))).toBe("2026-T4");
  });

  it("is due from the configured day and hour of the period's first month", () => {
    const monthly = { frequency: "mensual" as const, dayOfMonth: 10, hour: 10 };
    expect(schedule(monthly, new Date("2026-11-10T12:59:00Z")).due).toBe(false); // 09:59 in Argentina
    expect(schedule(monthly, new Date("2026-11-10T13:00:00Z")).due).toBe(true);
    expect(schedule(monthly, new Date("2026-11-09T23:00:00Z")).due).toBe(false);
    const quarterly = { frequency: "trimestral" as const, dayOfMonth: 10, hour: 10 };
    expect(schedule(quarterly, new Date("2026-10-05T15:00:00Z"))).toMatchObject({ period: "2026-T4", due: false, from: "10/10/2026 a las 10:00" });
    expect(schedule(quarterly, new Date("2026-11-02T15:00:00Z"))).toMatchObject({ period: "2026-T4", due: true });
  });
});

describe("una vez por socio y período", () => {
  it("goes to active members with email, with the exact payment data and no amount; the registry says who and how", async () => {
    await on();
    const withEmail = await member({ email: "Persona.Uno@example.com" });
    const noEmail = await member({ email: null });
    await member({ status: "suspendido" });
    const email = new MemoryEmailSender();
    expect(await reminderAudience(ctx.db)).toEqual({ withEmail: 1, withoutEmail: 1 });

    const r = await runFeeReminders(ctx.db, { email, ...BASE }, NOV);
    expect(r).toMatchObject({ status: "listo", period: "2026-11", sent: 1, failed: 0, counts: { enviado: 1, omitido: 1 } });
    expect(email.sent).toHaveLength(1);
    const [m] = email.sent as EmailMessage[];
    expect(m).toMatchObject({ to: "Persona.Uno@example.com", template: "fee_reminder", idempotencyKey: `fee-reminder:2026-11:${withEmail}`, subject: "Recordatorio: cuota social de Amarí Dul" });
    for (const v of ["Asociación Civil Amarí Dul", "Mercado Pago", "Amaridul.mp", "0000003100037002772495", "30-71843355-6", "http://localhost:3000/qr/cuota"]) expect(m.text).toContain(v);
    expect(m.html).toContain("0000003100037002772495");
    expect(m.text).not.toMatch(/\$\s?\d|ARS|vence el|vencimiento|al día|monto/i);

    const registry = await rows("2026-11");
    expect(registry.find((x) => x.memberId === withEmail)).toMatchObject({ status: "enviado", emailMasked: "Pe***@example.com", attempts: 1 });
    expect(registry.find((x) => x.memberId === noEmail)).toMatchObject({ status: "omitido", detail: "Sin email registrado.", attempts: 0 });
    expect(registry).toHaveLength(2);
    // The audit keeps the totals, never addresses.
    const [run] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "fee_reminder.run"));
    expect(run.metadata).toMatchObject({ period: "2026-11", sent: 1, failed: 0 });
    expect(JSON.stringify(run.metadata)).not.toContain("@");

    // Again, later the same month: nothing new.
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, new Date("2026-11-28T15:00:00Z"))).toMatchObject({ sent: 0 });
    expect(email.sent).toHaveLength(1);
    // Next month is a new period.
    await runFeeReminders(ctx.db, { email, ...BASE }, new Date("2026-12-03T15:00:00Z"));
    expect(email.sent.map((x) => x.idempotencyKey)).toEqual([`fee-reminder:2026-11:${withEmail}`, `fee-reminder:2026-12:${withEmail}`]);
  });

  it("two runs at once send each email once", async () => {
    await on();
    const ids = [await member(), await member(), await member(), await member()];
    const email = new MemoryEmailSender();
    await Promise.all([runFeeReminders(ctx.db, { email, ...BASE }, NOV), runFeeReminders(ctx.db, { email, ...BASE }, NOV), runFeeReminders(ctx.db, { email, ...BASE }, NOV)]);
    expect(email.sent).toHaveLength(ids.length);
    expect(new Set(email.sent.map((x) => x.to)).size).toBe(ids.length);
    expect((await rows("2026-11")).every((x) => x.status === "enviado" && x.attempts === 1)).toBe(true);
  });

  it("retries a failed email later, up to 3 times, and takes back a send left halfway with the same key", async () => {
    await on();
    const id = await member();
    const failing = { sent: [] as EmailMessage[], async send(m: EmailMessage) { this.sent.push(m); throw new EmailDeliveryError("Resend respondió 500"); } };
    const at = (minutes: number) => new Date(NOV.getTime() + minutes * 60_000);
    expect(await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(0))).toMatchObject({ failed: 1 });
    // Right away it is not retried (it waits an hour).
    expect(await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(5))).toMatchObject({ failed: 0, sent: 0 });
    await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(61));
    await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(122));
    await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(183));
    expect(failing.sent).toHaveLength(MAX_ATTEMPTS);
    const [row] = await rows("2026-11");
    expect(row).toMatchObject({ status: "fallido", attempts: 3, detail: "No se pudo enviar después de 3 intentos." });

    // A crash right after sending leaves the row "enviando": it is taken back with the same key,
    // which the provider drops if the first one had gone out.
    await ctx.db.update(feeReminderSends).set({ status: "enviando", attempts: 1, claimedAt: at(200) }).where(eq(feeReminderSends.memberId, id));
    const email = new MemoryEmailSender();
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, at(205))).toMatchObject({ sent: 0 });
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, at(216))).toMatchObject({ sent: 1 });
    expect(email.sent[0].idempotencyKey).toBe(failing.sent[0].idempotencyKey);
  });

  it("someone who stops being active before their turn is skipped, not emailed", async () => {
    await on();
    const id = await member();
    const email = new MemoryEmailSender();
    await runFeeReminders(ctx.db, { email, ...BASE }, NOV, { batch: 0 });
    expect((await rows("2026-11"))[0].status).toBe("pendiente");
    await ctx.db.update(members).set({ status: "suspendido" }).where(eq(members.id, id));
    await runFeeReminders(ctx.db, { email, ...BASE }, NOV);
    expect(email.sent).toHaveLength(0);
    expect((await ctx.db.select().from(feeReminderSends).where(and(eq(feeReminderSends.memberId, id))))[0]).toMatchObject({ status: "omitido", detail: "La membresía ya no está activa." });
  });

  it("waits for the configured day", async () => {
    await on("mensual", 20, 10);
    await member();
    const email = new MemoryEmailSender();
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, NOV)).toMatchObject({ status: "todavia-no", period: "2026-11" });
    expect(email.sent).toHaveLength(0);
  });
});

describe("la ejecución programada", () => {
  const call = (auth?: string) => cron.GET(new Request("http://localhost:3000/api/cron/recordatorio-cuota", { headers: auth ? { authorization: auth } : {} }));

  it("does not exist without its secret, and while off sends nothing", async () => {
    state.sender = new MemoryEmailSender();
    expect((await call()).status).toBe(404);
    vi.stubEnv("CRON_SECRET", "secreto-ficticio-de-prueba-largo");
    expect((await call()).status).toBe(404);
    expect((await call("Bearer otro-secreto-ficticio-largo")).status).toBe(404);
    await saveReminderSettings(ctx.db, adminId, { enabled: false, frequency: "mensual", dayOfMonth: 1, hour: 0 });
    const res = await call("Bearer secreto-ficticio-de-prueba-largo");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "desactivado" });
    expect((state.sender as MemoryEmailSender).sent).toHaveLength(0);
  });
});
