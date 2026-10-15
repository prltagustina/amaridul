import "server-only";
import * as z from "zod";

const keyring = z
  .string()
  .regex(/^v\d+:[A-Za-z0-9+/=_-]+(,v\d+:[A-Za-z0-9+/=_-]+)*$/, "Formato esperado: v1:<base64>,v2:<base64>");

const schema = z
  .object({
    APP_ENV: z.enum(["local", "test", "preview", "production"]).default("local"),
    DATABASE_URL: z.string().url().optional(),
    PGLITE_DIR: z.string().default(".data/pglite"),
    STORAGE_DIR: z.string().default(".data/storage"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
    FIELD_KEYS: keyring,
    FIELD_KEY_ACTIVE: z.string().regex(/^v\d+$/),
    LOOKUP_KEYS: keyring,
    LOOKUP_KEY_ACTIVE: z.string().regex(/^v\d+$/),
    EMAIL_FROM: z.string().default("Amarí Dul (local) <notificaciones@example.com>"),
    EMAIL_REPLY_TO: z.string().optional(),
    // Resend API key (server-only secret). When set, emails are really sent.
    RESEND_API_KEY: z.string().startsWith("re_").optional(),
    // TEMPORARY (demo phase): "log" lets production run without an email provider, writing
    // messages to the server logs instead of sending them. Remove once Resend is connected.
    EMAIL_DELIVERY: z.enum(["log"]).optional(),
    // Release switch: in production, registering or linking existing members (which creates members
    // and accounts) stays off until "on", set after the deploy's smoke test. Requests are always received.
    EXISTING_MEMBERS: z.enum(["on"]).optional(),
    // TEMPORARY (demo phase): comma-separated addresses that get a blind copy of every email, so
    // the team sees what the site sends. Copies include activation and reset links: remove before delivery.
    EMAIL_BCC: z
      .string()
      .optional()
      .transform((v) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))
      .pipe(z.array(z.string().email())),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === "production" && !env.DATABASE_URL) {
      ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "Obligatorio en producción" });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

// Validated lazily so that building the public static pages never requires secrets.
export function getEnv(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const fields = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Variables de entorno inválidas: ${fields}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  return schema.parse(source);
}

/** Whether the admin may create or link existing members (see EXISTING_MEMBERS). Always on outside production. */
export function existingMemberWritesEnabled(env: Pick<Env, "APP_ENV" | "EXISTING_MEMBERS"> = getEnv()): boolean {
  return env.APP_ENV !== "production" || env.EXISTING_MEMBERS === "on";
}
