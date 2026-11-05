"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, LoadingBlock, StatusBadge } from "@/components/ui/display";
import { controlClasses } from "@/components/ui/field";
import { searchAdminAction, type SearchGroupView } from "./actions";

type State = { status: "idle" } | { status: "loading"; previous: SearchGroupView[] } | { status: "done"; groups: SearchGroupView[]; text: string } | { status: "error"; message: string };

const COVERED: [string, string][] = [
  ["Socios", "nombre o apellido, DNI completo, número de socio (también uno anterior) y email"],
  ["Trámites REPROCANN", "la credencial vigente y la vinculación de cada socio que coincide; abre la revisión si hay una credencial pendiente"],
  ["Preadmisiones", "nombre, email y referencia (PRE-…)"],
  ["Admisiones", "nombre, DNI completo, email y referencia (ADM-…)"],
  ["Solicitudes de socios existentes", "nombre, DNI completo, email, referencia (SOC-…) y número declarado"],
  ["Productos", "nombre y variedad"],
];
const NETWORK_ERROR = "No pudimos buscar. Revisá la conexión y probá de nuevo.";

/**
 * Search across the panel. It asks the server as you type (a pause of 300 ms), shows a bounded
 * page per kind of record and asks for more of one kind on demand. The text is not put in the
 * address bar: it may be a DNI.
 */
export function AdminSearch() {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const seq = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();

  const query = text.trim();
  const active = query.length >= 2;
  const searching = () => setState((s) => ({ status: "loading", previous: s.status === "done" ? s.groups : s.status === "loading" ? s.previous : [] }));

  useEffect(() => input.current?.focus(), []);

  useEffect(() => {
    const id = ++seq.current;
    if (!active) return;
    const t = setTimeout(() => {
      searchAdminAction(query)
        .then((r) => {
          if (id !== seq.current) return;
          setState(r.ok ? { status: "done", groups: r.groups, text: query } : { status: "error", message: r.error });
        })
        .catch(() => {
          if (id === seq.current) setState({ status: "error", message: NETWORK_ERROR });
        });
    }, 300);
    return () => clearTimeout(t);
  }, [query, active, attempt]);

  async function more(g: SearchGroupView) {
    if (state.status !== "done") return;
    const forText = state.text;
    setLoadingMore(g.group);
    const r = await searchAdminAction(forText, { group: g.group, offset: g.hits.length }).catch(() => null);
    setLoadingMore(null);
    if (!r || !r.ok) {
      setState({ status: "error", message: r && !r.ok ? r.error : NETWORK_ERROR });
      return;
    }
    const next = r.groups[0];
    setState((s) =>
      s.status === "done" && s.text === forText
        ? { ...s, groups: s.groups.map((x) => (x.group === g.group ? { ...x, hits: [...x.hits, ...next.hits.filter((h) => !x.hits.some((y) => y.key === h.key))], more: next.more } : x)) }
        : s,
    );
  }

  // Under two characters there is nothing to search: whatever came before is not shown.
  const shown: State = active ? state : { status: "idle" };
  const groups = shown.status === "done" ? shown.groups : shown.status === "loading" ? shown.previous : [];
  const count = groups.reduce((n, g) => n + g.hits.length, 0);
  const announce =
    shown.status === "loading"
      ? "Buscando…"
      : shown.status === "done"
        ? count
          ? `${count}${groups.some((g) => g.more) ? " o más" : ""} ${count === 1 ? "resultado" : "resultados"} para «${shown.text}»`
          : `Sin resultados para «${shown.text}»`
        : shown.status === "error"
          ? shown.message
          : "";

  return (
    <div className="space-y-8">
      <form
        role="search"
        aria-label="Buscar en el panel"
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!active) return;
          searching();
          setAttempt((a) => a + 1);
        }}
      >
        <label htmlFor="admin-search" className="block text-label text-foreground">
          Buscar
        </label>
        <div className="relative max-w-2xl">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-text-muted" strokeWidth={1.5} />
          <input
            ref={input}
            id="admin-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim().length >= 2) searching();
            }}
            aria-describedby={hintId}
            placeholder="Ej.: Pérez, 30123456, A-0045 o PRE-2026-0012"
            className={cn(controlClasses, "pl-11")}
          />
        </div>
        <p id={hintId} className="text-small text-text-muted">
          Desde cualquier pantalla del panel: tecla <kbd className="!rounded-[4px] border border-border bg-white px-1.5 font-mono text-xs">/</kbd>. Un DNI se busca completo.
        </p>
      </form>

      <p role="status" aria-live="polite" className={cn("text-small", shown.status === "idle" ? "sr-only" : "text-text-muted")}>
        {announce}
      </p>

      {shown.status === "idle" && (
        <section aria-labelledby="que-se-busca" className="max-w-2xl !rounded-card border border-mist-line bg-white px-5 py-4">
          <h2 id="que-se-busca" className="text-h3 text-forest">
            Qué encuentra
          </h2>
          <dl className="mt-3 space-y-2 text-small">
            {COVERED.map(([k, v]) => (
              <div key={k} className="grid gap-x-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <dt className="font-medium text-foreground">{k}</dt>
                <dd className="text-text-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {shown.status === "loading" && !groups.length && <LoadingBlock label="Buscando…" lines={4} />}

      {shown.status === "error" && (
        <Alert tone="error" title="No pudimos buscar" live>
          <p>{shown.message}</p>
          <Button
            variant="secondary"
            shape="admin"
            className="mt-3"
            onClick={() => {
              searching();
              setAttempt((a) => a + 1);
            }}
          >
            Probar de nuevo
          </Button>
        </Alert>
      )}

      {shown.status === "done" && !groups.length && (
        <EmptyState
          icon={<SearchX aria-hidden className="size-10" strokeWidth={1.25} />}
          title={`No encontramos nada para «${shown.text}»`}
          description="Probá con el apellido solo, el DNI completo sin puntos o la referencia de la solicitud."
        />
      )}

      {groups.length > 0 && (
        <div className={cn("space-y-8 transition-opacity motion-safe-only", shown.status === "loading" && "opacity-60")} aria-busy={shown.status === "loading"}>
          {groups.map((g) => (
            <section key={g.group} aria-labelledby={`grupo-${g.group}`} className="space-y-3">
              <h2 id={`grupo-${g.group}`} className="text-h3 text-forest">
                {g.label} <span className="text-small font-normal text-text-muted">· {g.hits.length}{g.more ? " o más" : ""}</span>
              </h2>
              <ul className="divide-y divide-mist-line overflow-hidden !rounded-card border border-mist-line bg-white">
                {g.hits.map((h) => (
                  <li key={h.key}>
                    <Link href={h.href} className="flex min-h-14 items-center gap-3 px-4 py-3 !text-foreground hover:bg-forest-soft/60 focus-visible:bg-forest-soft/60">
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium [overflow-wrap:anywhere]">{h.title}</span>
                          {h.badge && <StatusBadge tone={h.badge.tone}>{h.badge.label}</StatusBadge>}
                        </span>
                        <span className="block text-small text-text-muted [overflow-wrap:anywhere]">
                          {h.detail}
                          {h.match && <span className="text-forest"> · {h.match}</span>}
                        </span>
                      </span>
                      <ChevronRight aria-hidden className="size-5 shrink-0 text-forest" strokeWidth={1.5} />
                    </Link>
                  </li>
                ))}
              </ul>
              {g.more && (
                <Button variant="ghost" shape="admin" className="-ml-1" onClick={() => void more(g)} loading={loadingMore === g.group} loadingLabel="Cargando…">
                  Ver más: {g.label.toLowerCase()}
                </Button>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
