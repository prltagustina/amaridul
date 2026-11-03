// The fee reminder: off until both the deployment and an admin allow it; once a month for members
// who chose to pay monthly and every three months for everyone else; one email per member and
// period, whatever happens (retries, a crash halfway, two runs at once); a registry of who, which
// period and what result; never a debt or a due date. No real emails.
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
const { memberFeePlan, setFeePlan } = await import("@/server/fee-plan");
const cron = await import("@/app/api/cron/recordatorio-cuota/route");

let ctx: Awaited<ReturnType<typeof makeContext>>;
let adminId: string;
let n = 0;
const BASE = { baseURL: "http://localhost:3000" };
const NOV = new Date("2026-11-15T15:00:00Z"); // 15/11/2026 12:00 in Argentina

/** A member with a person record; `email: null` means none registered. */
async function member(o: { email?: string | null; status?: "activo" | "suspendido" | "baja"; plan?: "mensual" | "trimestral" | "semestral" } = {}) {
  n += 1;
  const email = o.email === undefined ? `socio.cuota${n}@example.com` : o.email;
  const [p] = await ctx.db.insert(persons).values({ fullName: `Persona Cuota ${n}`, firstNames: `Persona${n}`, lastNames: "Ficticia", email, isFixture: true }).returning({ id: persons.id });
  const [m] = await ctx.db.insert(members).values({ personId: p.id, status: o.status ?? "activo", origin: "legacy" }).returning({ id: members.id });
  if (o.plan) await setFeePlan(ctx.db, adminId, m.id, o.plan);
  return m.id;
}
const rows = (period: string) => ctx.db.select().from(feeReminderSends).where(eq(feeReminderSends.period, period));
const on = async (dayOfMonth = 1, hour = 0) => {
  vi.stubEnv("FEE_REMINDERS", "on");
  await saveReminderSettings(ctx.db, adminId, { enabled: true, dayOfMonth, hour });
};
const keys = (email: MemoryEmailSender) => email.sent.map((x) => x.idempotencyKey);

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
    expect(await getReminderSettings(ctx.db)).toMatchObject({ enabled: false, dayOfMonth: 10, hour: 10 });
    await member();
    const email = new MemoryEmailSender();
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, NOV)).toMatchObject({ status: "desactivado", sent: 0 });
    await expect(saveReminderSettings(ctx.db, adminId, { enabled: true, dayOfMonth: 5, hour: 9 })).rejects.toBeInstanceOf(ReminderError);
    // Configured but not on: still nothing.
    await saveReminderSettings(ctx.db, adminId, { enabled: false, dayOfMonth: 5, hour: 9 });
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

  it("is due from the configured day and hour: every month for monthly payers, the quarter's first month for the rest", () => {
    const s = { dayOfMonth: 10, hour: 10 };
    expect(schedule(s, new Date("2026-11-10T12:59:00Z")).mensual.due).toBe(false); // 09:59 in Argentina
    expect(schedule(s, new Date("2026-11-10T13:00:00Z")).mensual.due).toBe(true);
    expect(schedule(s, new Date("2026-10-05T15:00:00Z")).trimestral).toMatchObject({ period: "2026-T4", due: false, from: "10/10/2026 a las 10:00" });
    expect(schedule(s, new Date("2026-11-02T15:00:00Z")).trimestral).toMatchObject({ period: "2026-T4", due: true });
  });
});

describe("una vez por socio y período, según su forma de pago", () => {
  it("monthly payers every month, the rest every three months, with the exact payment data and their plan", async () => {
    await on();
    const monthly = await member({ email: "Persona.Uno@example.com", plan: "mensual" });
    const quarterly = await member({ plan: "trimestral" });
    const half = await member({ plan: "semestral" });
    const none = await member();
    const noEmail = await member({ email: null });
    await member({ status: "suspendido", plan: "mensual" });
    expect(await reminderAudience(ctx.db)).toEqual({ monthly: 1, threeMonthly: 3, withoutEmail: 1, withoutPlan: 2 });

    const email = new MemoryEmailSender();
    const r = await runFeeReminders(ctx.db, { email, ...BASE }, NOV);
    expect(r).toMatchObject({ status: "listo", periods: ["2026-11", "2026-T4"], sent: 4, failed: 0, counts: { enviado: 4, omitido: 1 } });
    expect(keys(email).sort()).toEqual([`fee-reminder:2026-11:${monthly}`, `fee-reminder:2026-T4:${half}`, `fee-reminder:2026-T4:${none}`, `fee-reminder:2026-T4:${quarterly}`].sort());

    const to = (id: string) => email.sent.find((x) => x.idempotencyKey?.endsWith(id))!;
    // Amounts carry a non-breaking space after «$», as es-AR writes them.
    const text = (id: string) => to(id).text.replace(/\u00a0/g, " ");
    expect(to(monthly)).toMatchObject({ to: "Persona.Uno@example.com", template: "fee_reminder", subject: "Recordatorio: cuota social de Amarí Dul" });
    expect(text(monthly)).toContain("elegiste pagarla mes a mes, $ 5.000 por mes");
    expect(text(quarterly)).toContain("elegiste pagarla por trimestre, $ 15.000 cada 3 meses");
    expect(text(half)).toContain("elegiste pagarla por semestre, $ 30.000 cada 6 meses");
    expect(text(none)).toContain("Podés pagarla mes a mes, por trimestre ($ 15.000) o por semestre ($ 30.000)");
    for (const m of email.sent) {
      for (const v of ["Asociación Civil Amarí Dul", "Mercado Pago", "Amaridul.mp", "0000003100037002772495", "30-71843355-6", "http://localhost:3000/qr/cuota"]) expect(m.text).toContain(v);
      expect(m.html).toContain("0000003100037002772495");
      expect(m.text).not.toMatch(/vence el|vencimiento|al día|debés|adeud/i);
    }

    const registry = await rows("2026-11");
    expect(registry).toEqual([expect.objectContaining({ memberId: monthly, status: "enviado", emailMasked: "Pe***@example.com", attempts: 1 })]);
    expect((await rows("2026-T4")).find((x) => x.memberId === noEmail)).toMatchObject({ status: "omitido", detail: "Sin email registrado.", attempts: 0 });
    // The audit keeps the totals, never addresses.
    const [run] = await ctx.db.select().from(auditLogs).where(eq(auditLogs.action, "fee_reminder.run"));
    expect(run.metadata).toMatchObject({ periods: "2026-11, 2026-T4", sent: 4, failed: 0 });
    expect(JSON.stringify(run.metadata)).not.toContain("@");

    // Later the same month: nothing new.
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, new Date("2026-11-28T15:00:00Z"))).toMatchObject({ sent: 0 });
    // Next month: only the monthly payer. Next quarter: everyone again.
    await runFeeReminders(ctx.db, { email, ...BASE }, new Date("2026-12-03T15:00:00Z"));
    expect(keys(email).filter((k) => k?.includes(":2026-12:"))).toEqual([`fee-reminder:2026-12:${monthly}`]);
    expect(email.sent).toHaveLength(5);
    await runFeeReminders(ctx.db, { email, ...BASE }, new Date("2027-01-05T15:00:00Z"));
    expect(keys(email).filter((k) => k?.includes(":2027-")).sort()).toEqual([`fee-reminder:2027-01:${monthly}`, `fee-reminder:2027-T1:${half}`, `fee-reminder:2027-T1:${none}`, `fee-reminder:2027-T1:${quarterly}`].sort());
  });

  it("two runs at once send each email once", async () => {
    await on();
    const ids = [await member(), await member({ plan: "mensual" }), await member(), await member({ plan: "semestral" })];
    const email = new MemoryEmailSender();
    await Promise.all([runFeeReminders(ctx.db, { email, ...BASE }, NOV), runFeeReminders(ctx.db, { email, ...BASE }, NOV), runFeeReminders(ctx.db, { email, ...BASE }, NOV)]);
    expect(email.sent).toHaveLength(ids.length);
    expect(new Set(email.sent.map((x) => x.to)).size).toBe(ids.length);
    expect([...(await rows("2026-11")), ...(await rows("2026-T4"))].every((x) => x.status === "enviado" && x.attempts === 1)).toBe(true);
  });

  it("retries a failed email later, up to 3 times, and takes back a send left halfway with the same key", async () => {
    await on();
    const id = await member();
    const failing = {
      sent: [] as EmailMessage[],
      async send(m: EmailMessage) {
        this.sent.push(m);
        throw new EmailDeliveryError("Resend respondió 500");
      },
    };
    const at = (minutes: number) => new Date(NOV.getTime() + minutes * 60_000);
    expect(await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(0))).toMatchObject({ failed: 1 });
    // Right away it is not retried (it waits an hour).
    expect(await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(5))).toMatchObject({ failed: 0, sent: 0 });
    await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(61));
    await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(122));
    await runFeeReminders(ctx.db, { email: failing, ...BASE }, at(183));
    expect(failing.sent).toHaveLength(MAX_ATTEMPTS);
    const [row] = await rows("2026-T4");
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
    expect((await rows("2026-T4"))[0].status).toBe("pendiente");
    await ctx.db.update(members).set({ status: "suspendido" }).where(eq(members.id, id));
    await runFeeReminders(ctx.db, { email, ...BASE }, NOV);
    expect(email.sent).toHaveLength(0);
    expect((await ctx.db.select().from(feeReminderSends).where(and(eq(feeReminderSends.memberId, id))))[0]).toMatchObject({ status: "omitido", detail: "La membresía ya no está activa." });
  });

  it("waits for the configured day", async () => {
    await on(20, 10);
    await member();
    await member({ plan: "mensual" });
    const email = new MemoryEmailSender();
    expect(await runFeeReminders(ctx.db, { email, ...BASE }, new Date("2026-10-15T15:00:00Z"))).toMatchObject({ status: "todavia-no" });
    expect(email.sent).toHaveLength(0);
  });
});

describe("la forma de pago", () => {
  it("is chosen by the member or set by an admin, recorded with who did it", async () => {
    const id = await member();
    expect(await memberFeePlan(ctx.db, id)).toEqual({ plan: null, chosenAt: null, byMember: false });
    const { userId } = await ctx.createMember({ n: 900 + n, dni: `9906${String(n).padStart(4, "0")}`, password: "frase ficticia larga" });
    await setFeePlan(ctx.db, userId, id, "trimestral");
    expect(await memberFeePlan(ctx.db, id)).toMatchObject({ plan: "trimestral", byMember: true });
    await setFeePlan(ctx.db, adminId, id, "mensual");
    expect(await memberFeePlan(ctx.db, id)).toMatchObject({ plan: "mensual", byMember: false });
    const logs = await ctx.db.select().from(auditLogs).where(and(eq(auditLogs.action, "member.fee_plan_set"), eq(auditLogs.entityId, id)));
    expect(logs.map((l) => l.metadata)).toEqual([
      { plan_before: null, plan_after: "trimestral", by: "socio" },
      { plan_before: "trimestral", plan_after: "mensual", by: "administración" },
    ]);
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
    await saveReminderSettings(ctx.db, adminId, { enabled: false, dayOfMonth: 1, hour: 0 });
    const res = await call("Bearer secreto-ficticio-de-prueba-largo");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "desactivado" });
    expect((state.sender as MemoryEmailSender).sent).toHaveLength(0);
  });
});
