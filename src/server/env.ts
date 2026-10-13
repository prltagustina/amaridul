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
    // TEMPORARY (demo phase): "log" lets production run without an email provider, writing
    // messages to the server logs instead of sending them. Remove once Resend is connected.
    EMAIL_DELIVERY: z.enum(["log"]).optional(),
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
