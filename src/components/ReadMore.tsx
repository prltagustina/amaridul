"use client";

import { useState } from "react";

export default function ReadMore({ id, children }: { id: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        id={id}
        data-open={open}
        inert={!open}
        aria-hidden={!open}
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100 motion-reduce:transition-none"
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-4 pt-4">{children}</div>
        </div>
      </div>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="mt-5 inline-flex min-h-11 items-center gap-2 border-b border-b-transparent text-base sm:text-lg text-[#3f6043] hover:border-b-[#3f6043] transition-colors motion-reduce:transition-none"
      >
        {open ? "Cerrar" : "Leer más"}
        <svg
          aria-hidden="true"
          viewBox="0 0 12 12"
          className={`h-3 w-3 transition-transform duration-300 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}
