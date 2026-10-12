import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { Alert, Card } from "@/components/ui/display";
import { STEP_IDS } from "@/app/admision/solicitud/steps";

type Item = { href: string; label: string; note?: string; states?: { label: string; href: string }[] };
type Group = { id: string; title: string; description: string; items: Item[]; auth?: boolean };

const st = (path: string, states: string[], param = "estado") => states.map((s) => ({ label: s, href: `${path}${path.includes("?") ? "&" : "?"}${param}=${s}` }));

const GROUPS: Group[] = [
  {
    id: "publico",
    title: "Público",
    description: "Lo que ve cualquier persona que escanea el QR.",
    items: [
      { href: "/", label: "Home", note: "Sin cambios en esta fase" },
      { href: "/qr", label: "/qr · landing del QR", note: "Hero, preguntas frecuentes y CTAs" },
      { href: "/sumate", label: "Sumate · preadmisión", states: st("/sumate", ["loading", "error", "success"]) },
    ],
  },
  {
    id: "admision",
    title: "Admisión formal",
    description: "Invitación personal y los nueve pasos de la solicitud.",
    items: [
      { href: "/admision", label: "Invitación", states: st("/admision", ["expired", "unauthorized"]) },
      {
        href: "/admision/solicitud",
        label: "Solicitud · pasos A–I",
        note: "Con un paso avanzado, los anteriores se completan con datos ficticios",
        states: [
          ...[...STEP_IDS, "resumen", "enviada"].map((p) => ({ label: p, href: `/admision/solicitud?paso=${p}` })),
          { label: "error de validación", href: "/admision/solicitud?paso=B&estado=error" },
          { label: "guardando", href: "/admision/solicitud?paso=C&estado=loading" },
        ],
      },
    ],
  },
  {
    id: "socio",
    title: "Socio",
    description: "Acceso y portal privado (demo: cualquier DNI entra, 99000099 muestra error).",
    items: [
      { href: "/qr/login", label: "Ingreso", states: st("/qr/login", ["loading", "error", "expired", "disabled"]) },
      { href: "/qr/recuperar", label: "Recuperar contraseña", states: st("/qr/recuperar", ["enviado", "nueva", "expired", "success"]) },
      { href: "/qr/activar", label: "Activar cuenta", states: st("/qr/activar", ["loading", "expired", "unauthorized", "success"]) },
      { href: "/qr/mi-espacio", label: "Mi espacio", states: st("/qr/mi-espacio", ["loading", "error"]) },
      { href: "/qr/trazabilidad", label: "Trazabilidad", states: st("/qr/trazabilidad", ["lote", "invalido", "loading", "error", "sin-certificado", "certificado"]) },
    ],
  },
  {
    id: "admin",
    title: "Administración",
    description: "Requiere ingresar con la cuenta admin ficticia.",
    auth: true,
    items: [
      { href: "/admin/login", label: "Ingreso admin", states: [{ label: "segundo factor", href: "/admin/login?demo=segundo-factor" }] },
      { href: "/admin", label: "Inicio · pendientes" },
      { href: "/admin/preadmisiones", label: "Preadmisiones", states: [...st("/admin/preadmisiones", ["loading", "empty", "error"]), { label: "detalle", href: "/admin/preadmisiones/pre-2026-0007" }] },
      {
        href: "/admin/admisiones",
        label: "Admisiones",
        states: [
          ...st("/admin/admisiones", ["loading", "empty", "error"]),
          { label: "en curso", href: "/admin/admisiones/adm-2026-0003" },
          { label: "recibida", href: "/admin/admisiones/adm-2026-0002" },
          { label: "decisión de Comisión", href: "/admin/admisiones/adm-2026-0001?dialogo=decision" },
        ],
      },
      { href: "/admin/socios", label: "Socios", states: [...st("/admin/socios", ["loading", "empty", "error"]), { label: "activo", href: "/admin/socios/ad-0003" }, { label: "suspendido", href: "/admin/socios/ad-0002" }] },
      { href: "/admin/productos", label: "Productos", states: st("/admin/productos", ["loading", "empty", "error"]) },
      { href: "/admin/lotes", label: "Lotes", states: [...st("/admin/lotes", ["loading", "empty", "error"]), { label: "editar", href: "/admin/lotes/ad-2025-08-01" }, { label: "nuevo", href: "/admin/lotes/nuevo" }] },
      { href: "/admin/codigos", label: "Códigos", states: st("/admin/codigos", ["loading", "empty", "error"]) },
      { href: "/admin/auditoria", label: "Auditoría", states: st("/admin/auditoria", ["loading", "empty", "error"]) },
      { href: "/admin/seguridad", label: "Seguridad" },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    description: "Estados generales y guía visual.",
    items: [
      { href: "/una-ruta-que-no-existe", label: "404 real" },
      { href: "/dev/estados", label: "Estados de sistema", states: st("/dev/estados", ["expired", "unauthorized", "error", "offline"]) },
      { href: "/dev/estilo", label: "Guía de estilo", note: "Tokens, tipografía y componentes" },
      { href: "/dev/tipografia", label: "Tipografía", note: "Cinco combinaciones para elegir" },
    ],
  },
];

export default function RecorridoPage() {
  return (
    <main className="page-gutter pt-10 pb-24">
      <div className="admin-column space-y-10">
        <header className="space-y-3">
          <p className="text-eyebrow text-accent">Demo local · datos ficticios</p>
          <h1 className="text-h1 text-forest">Recorrido de pantallas</h1>
          <p className="max-w-2xl text-body text-text-muted">
            Todas las vistas nuevas, con sus estados. Las acciones son simuladas: no se guarda ni se envía nada. En cada pantalla, la barra “Dev” abajo a la derecha cambia de estado.
          </p>
          <nav aria-label="Secciones" className="flex flex-wrap gap-2 pt-1">
            {GROUPS.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="!rounded-full border border-border-strong/50 px-3.5 py-1.5 text-small !text-forest hover:bg-forest-soft">
                {g.title}
              </a>
            ))}
          </nav>
        </header>

        {GROUPS.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-title`} className="scroll-mt-6 space-y-4">
            <div className="space-y-1">
              <h2 id={`${g.id}-title`} className="flex items-center gap-2 text-h2 text-forest">
                {g.title}
                {g.auth && <Lock aria-hidden className="size-5 text-accent" strokeWidth={1.5} />}
              </h2>
              <p className="text-small text-text-muted">{g.description}</p>
            </div>
            {g.auth && (
              <Alert tone="info">
                Ingresá en /admin/login con admin.local@example.com. En local la verificación en dos pasos es opcional; en producción es obligatoria.
              </Alert>
            )}
            <ul className="grid gap-3 md:grid-cols-2">
              {g.items.map((item) => (
                <li key={item.href}>
                  <Card className="h-full space-y-3" padded={false}>
                    <div className="px-5 pt-4">
                      <Link href={item.href} className="group inline-flex items-center gap-1.5 text-base font-medium !text-forest">
                        {item.label}
                        <ArrowUpRight aria-hidden className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.5} />
                      </Link>
                      <p className="font-mono text-xs text-text-muted">{item.href}</p>
                      {item.note && <p className="mt-1 text-small text-text-muted">{item.note}</p>}
                    </div>
                    {item.states && (
                      <ul className="flex flex-wrap gap-1.5 border-t border-border px-5 py-3" aria-label={`Estados de ${item.label}`}>
                        {item.states.map((s) => (
                          <li key={s.href}>
                            <Link href={s.href} className="inline-flex min-h-8 items-center !rounded-full bg-info-bg px-2.5 text-xs !text-info-fg hover:bg-accent hover:!text-white">
                              {s.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!item.states && <div className="pb-1" />}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
