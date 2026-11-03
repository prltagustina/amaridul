import { ExternalLink } from "lucide-react";
import { DataList } from "@/components/ui/data-list";
import { Alert, Card, DevTag, EmptyState, StatusBadge, type Tone } from "@/components/ui/display";
import { localDemo } from "@/lib/features";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { emailTemplates } from "@/server/email/templates";
import { FREQUENCIES, getReminderSettings, listReminderSends, reminderAudience, remindersAllowed, schedule } from "@/server/fee-reminders";
import { AdminPageHeader } from "../../ui";
import { SettingsForm } from "./settings-form";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  pendiente: { label: "Pendiente", tone: "neutral" },
  enviando: { label: "Enviando", tone: "info" },
  enviado: { label: "Enviado", tone: "success" },
  fallido: { label: "Falló", tone: "error" },
  omitido: { label: "Omitido", tone: "warning" },
};
const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

export default async function RecordatorioCuotaPage() {
  await requireAdmin();
  const db = await getDb();
  const [settings, audience, sends] = await Promise.all([getReminderSettings(db), reminderAudience(db), listReminderSends(db)]);
  const allowed = remindersAllowed();
  const next = schedule(settings, new Date());
  const preview = emailTemplates.fee_reminder({ name: "Nombre", url: "https://amaridul.com/qr/cuota" });
  const on = allowed && settings.enabled;

  return (
    <>
      <AdminPageHeader eyebrow="Padrón" title="Recordatorio de cuota" description="Un aviso general por email con los datos de pago de la asociación. No registra pagos ni indica deudas." />
      <div className="space-y-8">
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h3 text-forest">Programación</h2>
              <StatusBadge tone={on ? "success" : "neutral"}>{on ? "Activo" : "Apagado"}</StatusBadge>
            </div>
            {!allowed ? (
              <Alert tone="info" title="El envío automático está apagado en este entorno">
                Se puede dejar configurado, pero no sale ningún email. Se habilita cuando la asociación defina el recordatorio.
              </Alert>
            ) : (
              <p className="text-small text-text-muted">{on ? `Período actual ${next.period}: ${next.due ? "ya corresponde enviarlo" : `sale desde el ${next.from}`}.` : "Apagado: no sale ningún email."}</p>
            )}
            <p className="text-small text-text-muted">
              Hoy lo recibirían {audience.withEmail} {audience.withEmail === 1 ? "socio activo" : "socios activos"} con email
              {audience.withoutEmail ? `; ${audience.withoutEmail} sin email registrado no lo recibirían` : ""}.
            </p>
            <SettingsForm
              allowed={allowed}
              frequencies={FREQUENCIES}
              initial={{ enabled: settings.enabled, frequency: settings.frequency, dayOfMonth: String(settings.dayOfMonth), hour: String(settings.hour) }}
            />
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-h3 text-forest">Vista previa</h2>
              <a href="/admin/cuota/vista-previa" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 text-small font-medium !text-forest underline-offset-4 hover:underline">
                Ver el email con su diseño <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
              </a>
            </div>
            <p className="text-small">
              <span className="text-text-muted">Asunto:</span> {preview.subject}
            </p>
            <pre className="max-h-[28rem] overflow-auto !rounded-control border border-border bg-surface-sunken p-4 font-sans text-small leading-relaxed whitespace-pre-wrap">{preview.text}</pre>
            <p className="text-small text-text-muted">Con un socio ficticio («Nombre»). Nada de esto se envía.</p>
          </Card>
        </div>

        <section aria-labelledby="registro" className="space-y-3">
          <h2 id="registro" className="text-h3 text-forest">
            Registro de envíos
          </h2>
          {sends.length ? (
            <DataList
              caption="Registro de envíos del recordatorio de cuota"
              rows={sends}
              rowKey={(r) => `${r.period}-${r.memberId}`}
              columns={[
                { key: "member", header: "Socio", primary: true, render: (r) => `${r.name}${r.number ? ` · ${r.number}` : ""}` },
                { key: "period", header: "Período", render: (r) => <span className="tabular-nums">{r.period}</span> },
                { key: "to", header: "Email", render: (r) => r.emailMasked ?? "—" },
                { key: "status", header: "Resultado", render: (r) => <StatusBadge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</StatusBadge> },
                { key: "detail", header: "Detalle", render: (r) => (r.sentAt ? `Enviado el ${stamp.format(r.sentAt)}` : (r.detail ?? "—")) },
                { key: "attempts", header: "Intentos", render: (r) => <span className="tabular-nums">{r.attempts}</span> },
              ]}
            />
          ) : (
            <EmptyState title="Todavía no se envió ningún recordatorio" description="Cada envío queda registrado acá: a quién, de qué período y con qué resultado." />
          )}
        </section>

        {localDemo() && (
          <div className="dev-only space-y-2 !rounded-card border border-dashed border-border p-5 text-small text-text-muted">
            <DevTag>Vista local · pendiente de definir con la asociación</DevTag>
            <p>Monto y período que cubre la cuota; si «trimestral» es el período pagado o la frecuencia del aviso; fechas; destinatarios; registro de pagos para no avisar a quien ya pagó; link de Mercado Pago.</p>
          </div>
        )}
      </div>
    </>
  );
}
