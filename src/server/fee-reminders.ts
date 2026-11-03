// The membership fee reminder: a general email per period to the active members, with the
// association's payment data. Off by default, twice over: the deployment must allow it
// (FEE_REMINDERS=on) and an admin must turn it on. Nothing here is scheduled yet.
//
// No duplicates: each member gets one row per period, written before the email goes out. A run
// claims rows one at a time (FOR UPDATE SKIP LOCKED), so two runs at once never take the same one,
// and the email carries an idempotency key, so a retry after a lost answer is dropped by the provider.
import { and, asc, count, desc, eq, lt, or, sql } from "drizzle-orm";
import * as z from "zod";
import type { Database } from "@/server/db/client";
import { admissions, feeReminderSends, feeReminderSettings, members, persons } from "@/server/db/schema";
import { audit } from "@/server/audit/log";
import type { EmailSender } from "@/server/email/sender";
import { emailTemplates } from "@/server/email/templates";
import { deliveryEmail } from "@/server/members";
import { FEE_PAGE } from "@/lib/fee-payment";

export const REMINDER_TIME_ZONE = "America/Argentina/Buenos_Aires";
export const MAX_ATTEMPTS = 3;
/** A failed email is tried again after this long; a claim left halfway (a crash) is taken back. */
const RETRY_AFTER_MS = 60 * 60_000;
const STALE_CLAIM_MS = 15 * 60_000;

export type Frequency = "mensual" | "trimestral";
export const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "mensual", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
];

/** The deployment allows the reminder only with FEE_REMINDERS=on. Off everywhere for now. */
export const remindersAllowed = () => process.env.FEE_REMINDERS === "on";

export class ReminderError extends Error {}

export type ReminderSettings = { enabled: boolean; frequency: Frequency; dayOfMonth: number; hour: number; updatedAt: Date | null };
const DEFAULTS: ReminderSettings = { enabled: false, frequency: "trimestral", dayOfMonth: 10, hour: 10, updatedAt: null };

export async function getReminderSettings(db: Database): Promise<ReminderSettings> {
  const [row] = await db.select().from(feeReminderSettings).where(eq(feeReminderSettings.id, "default"));
  return row ? { enabled: row.enabled, frequency: row.frequency, dayOfMonth: row.dayOfMonth, hour: row.hour, updatedAt: row.updatedAt } : DEFAULTS;
}

export const settingsInput = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["mensual", "trimestral"], { error: "Elegí cada cuánto." }),
  dayOfMonth: z.coerce.number({ error: "Indicá el día." }).int().min(1, "Del 1 al 28.").max(28, "Del 1 al 28: así existe en todos los meses."),
  hour: z.coerce.number({ error: "Indicá la hora." }).int().min(0, "De 0 a 23.").max(23, "De 0 a 23."),
});
export type SettingsInput = z.infer<typeof settingsInput>;

/** Saves the schedule. Turning it on is refused while the deployment does not allow sending. */
export async function saveReminderSettings(db: Database, actorUserId: string, input: SettingsInput, now = new Date()): Promise<void> {
  if (input.enabled && !remindersAllowed()) throw new ReminderError("El envío automático no está habilitado en este entorno: se puede dejar configurado, pero no activarlo.");
  const before = await getReminderSettings(db);
  const changed = (["enabled", "frequency", "dayOfMonth", "hour"] as const).filter((k) => before[k] !== input[k]);
  if (!changed.length) return;
  await db.transaction(async (tx) => {
    await tx
      .insert(feeReminderSettings)
      .values({ id: "default", ...input, updatedBy: actorUserId, updatedAt: now })
      .onConflictDoUpdate({ target: feeReminderSettings.id, set: { ...input, updatedBy: actorUserId, updatedAt: now } });
    const metadata: Record<string, string | number | boolean> = {};
    for (const k of changed) {
      metadata[`${k}_before`] = before[k];
      metadata[`${k}_after`] = input[k];
    }
    await audit(tx as unknown as Database, { actorUserId, action: "fee_reminder.settings_updated", entityType: "fee_reminder", entityId: null, metadata });
  });
}

// ── When ──────────────────────────────────────────────────────────────────────────────────────

/** Argentina's calendar date and hour for an instant. */
function inArgentina(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: REMINDER_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day), hour: Number(parts.hour) };
}

/** "2026-11" for a monthly reminder, "2026-T4" for a quarterly one, in Argentina's calendar. */
export function periodOf(frequency: Frequency, now: Date): string {
  const { year, month } = inArgentina(now);
  return frequency === "mensual" ? `${year}-${String(month).padStart(2, "0")}` : `${year}-T${Math.ceil(month / 3)}`;
}

/** The current period and whether its reminder is due: from the configured day and hour of its first month. */
export function schedule(s: Pick<ReminderSettings, "frequency" | "dayOfMonth" | "hour">, now: Date) {
  const t = inArgentina(now);
  const firstMonth = s.frequency === "mensual" ? t.month : 3 * (Math.ceil(t.month / 3) - 1) + 1;
  const due = t.month > firstMonth || t.day > s.dayOfMonth || (t.day === s.dayOfMonth && t.hour >= s.hour);
  const from = `${String(s.dayOfMonth).padStart(2, "0")}/${String(firstMonth).padStart(2, "0")}/${t.year} a las ${String(s.hour).padStart(2, "0")}:00`;
  return { period: periodOf(s.frequency, now), due, from };
}

// ── Who ───────────────────────────────────────────────────────────────────────────────────────

const mask = (to: string) => to.replace(/^(.{0,2})[^@]*(@.*)?$/, (_, head: string, domain = "") => `${head}***${domain}`);

/** Active members and the address their emails go to (empty when there is none). */
async function activeMembers(db: Database, memberId?: string) {
  const rows = await db
    .select({ id: members.id, status: members.status, firstNames: persons.firstNames, fullName: persons.fullName, email: persons.email, notificationEmail: admissions.notificationEmail })
    .from(members)
    .innerJoin(persons, eq(persons.id, members.personId))
    .leftJoin(admissions, eq(admissions.id, members.admissionId))
    .where(memberId ? eq(members.id, memberId) : eq(members.status, "activo"));
  return rows.map((r) => ({ id: r.id, status: r.status, firstName: (r.firstNames ?? r.fullName).trim().split(/\s+/)[0], to: deliveryEmail(r) }));
}

/** Who would get it now, without writing anything: for the admin's review. */
export async function reminderAudience(db: Database) {
  const all = await activeMembers(db);
  return { withEmail: all.filter((m) => m.to).length, withoutEmail: all.filter((m) => !m.to).length };
}

// ── Sending ───────────────────────────────────────────────────────────────────────────────────

export type RunResult = { status: "desactivado" | "todavia-no" | "listo"; period: string | null; sent: number; failed: number; counts: Record<string, number> };

/** One row per active member for the period; members already listed keep theirs. */
async function enqueue(db: Database, period: string, now: Date) {
  const list = await activeMembers(db);
  if (!list.length) return;
  await db
    .insert(feeReminderSends)
    .values(list.map((m) => (m.to ? { period, memberId: m.id, emailMasked: mask(m.to), createdAt: now } : { period, memberId: m.id, status: "omitido" as const, detail: "Sin email registrado.", createdAt: now })))
    .onConflictDoNothing({ target: [feeReminderSends.period, feeReminderSends.memberId] });
}

/** Takes the next row to send, if any. Only one run can take a given row. */
async function claimNext(db: Database, period: string, now: Date) {
  return db.transaction(async (tx) => {
    const [next] = await tx
      .select({ id: feeReminderSends.id })
      .from(feeReminderSends)
      .where(
        and(
          eq(feeReminderSends.period, period),
          or(
            eq(feeReminderSends.status, "pendiente"),
            and(eq(feeReminderSends.status, "fallido"), lt(feeReminderSends.attempts, MAX_ATTEMPTS), lt(feeReminderSends.claimedAt, new Date(now.getTime() - RETRY_AFTER_MS))),
            and(eq(feeReminderSends.status, "enviando"), lt(feeReminderSends.claimedAt, new Date(now.getTime() - STALE_CLAIM_MS))),
          ),
        ),
      )
      .orderBy(asc(feeReminderSends.createdAt), asc(feeReminderSends.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!next) return null;
    const [claimed] = await tx
      .update(feeReminderSends)
      .set({ status: "enviando", claimedAt: now, attempts: sql`${feeReminderSends.attempts} + 1` })
      .where(eq(feeReminderSends.id, next.id))
      .returning();
    return claimed;
  });
}

const mark = (db: Database, id: string, set: Partial<typeof feeReminderSends.$inferInsert>) => db.update(feeReminderSends).set(set).where(eq(feeReminderSends.id, id));

/** Sends one claimed row. True when the email went out. */
async function deliver(db: Database, deps: { email: EmailSender; baseURL: string }, job: typeof feeReminderSends.$inferSelect, now: Date): Promise<boolean | null> {
  const [m] = await activeMembers(db, job.memberId);
  if (!m || m.status !== "activo") return mark(db, job.id, { status: "omitido", detail: "La membresía ya no está activa." }).then(() => null);
  if (!m.to) return mark(db, job.id, { status: "omitido", detail: "Sin email registrado." }).then(() => null);
  const content = emailTemplates.fee_reminder({ name: m.firstName, url: `${deps.baseURL.replace(/\/$/, "")}${FEE_PAGE}` });
  try {
    await deps.email.send({ to: m.to, ...content, template: "fee_reminder", idempotencyKey: `fee-reminder:${job.period}:${job.memberId}` });
  } catch (e) {
    console.error("Fee reminder not sent:", e instanceof Error ? e.message.slice(0, 120) : e);
    await mark(db, job.id, { status: "fallido", detail: job.attempts >= MAX_ATTEMPTS ? "No se pudo enviar después de 3 intentos." : "No se pudo enviar: se vuelve a intentar más tarde." });
    return false;
  }
  await mark(db, job.id, { status: "enviado", sentAt: now, detail: null, emailMasked: mask(m.to) });
  return true;
}

export async function periodCounts(db: Database, period: string): Promise<Record<string, number>> {
  const rows = await db.select({ status: feeReminderSends.status, n: count() }).from(feeReminderSends).where(eq(feeReminderSends.period, period)).groupBy(feeReminderSends.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

/**
 * One run: if the reminder is on and due, lists this period's recipients and sends up to `batch`
 * emails. Safe to call again at any time (by a schedule, by hand, twice at once): what was sent
 * stays sent, and what failed is retried later, up to 3 times.
 */
export async function runFeeReminders(db: Database, deps: { email: EmailSender; baseURL: string }, now = new Date(), { batch = 40 } = {}): Promise<RunResult> {
  const s = await getReminderSettings(db);
  if (!remindersAllowed() || !s.enabled) return { status: "desactivado", period: null, sent: 0, failed: 0, counts: {} };
  const { period, due } = schedule(s, now);
  if (!due) return { status: "todavia-no", period, sent: 0, failed: 0, counts: await periodCounts(db, period) };
  await enqueue(db, period, now);
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < batch; i++) {
    const job = await claimNext(db, period, now);
    if (!job) break;
    const r = await deliver(db, deps, job, now);
    if (r === true) sent++;
    if (r === false) failed++;
  }
  const counts = await periodCounts(db, period);
  if (sent || failed) await audit(db, { action: "fee_reminder.run", entityType: "fee_reminder", entityId: null, metadata: { period, sent, failed, ...counts } });
  return { status: "listo", period, sent, failed, counts };
}

/** The registry, newest period first: per member, the period, where it went (masked) and the result. */
export async function listReminderSends(db: Database, limit = 200) {
  return db
    .select({
      period: feeReminderSends.period,
      memberId: feeReminderSends.memberId,
      name: sql<string>`coalesce(${persons.lastNames} || ', ' || ${persons.firstNames}, ${persons.fullName})`,
      number: members.memberNumber,
      emailMasked: feeReminderSends.emailMasked,
      status: feeReminderSends.status,
      detail: feeReminderSends.detail,
      attempts: feeReminderSends.attempts,
      sentAt: feeReminderSends.sentAt,
    })
    .from(feeReminderSends)
    .innerJoin(members, eq(members.id, feeReminderSends.memberId))
    .innerJoin(persons, eq(persons.id, members.personId))
    .orderBy(desc(feeReminderSends.period), asc(persons.fullName))
    .limit(limit);
}
