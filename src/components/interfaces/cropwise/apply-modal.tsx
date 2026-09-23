"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const COUNTRIES = [
  "País de ejemplo A",
  "País de ejemplo B",
  "País de ejemplo C",
  "País de ejemplo D",
];

const CATEGORIES = ["Categoría A", "Categoría B", "Categoría C", "Categoría D"];

const TIMING_OPTIONS = [
  "Lo antes posible",
  "En 1-3 meses",
  "En más de 3 meses",
  "Solo estoy explorando",
];

const CURRENT_PROGRAMS = ["Programa A", "Programa B", "Programa C", "Ninguno actualmente"];

const inputClass =
  "w-full rounded-xl border border-[#1a2413]/15 bg-white px-4 py-2.5 text-sm text-[#1a2413] outline-none transition-colors focus:border-[#1a2413]/40";

type Status = "idle" | "submitting" | "success" | "error";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[#1a2413]">
      {label}
      {children}
    </label>
  );
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function ApplyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [unit, setUnit] = useState<"unidad-1" | "unidad-2">("unidad-1");
  const [categories, setCategories] = useState<string[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    // Simulated request — no real backend behind this demo form.
    setTimeout(() => {
      setStatus(Math.random() > 0.15 ? "success" : "error");
    }, 1100);
  }

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex justify-center bg-[#1a2413]/60 p-4 sm:p-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Formulario de contacto de ejemplo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#eae6d9] outline-none"
      >
        <div className="flex items-center justify-between border-b border-[#1a2413]/10 px-6 py-5 sm:px-8">
          <h2 className="text-lg font-bold text-[#1a2413]">Aplicar ahora</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="text-[#1a2413] transition-opacity hover:opacity-60"
          >
            <X className="size-6" aria-hidden />
          </button>
        </div>

        {/* Internal scroll only — body scroll is locked while this is open */}
        <div className="overflow-y-auto px-6 py-6 sm:px-8">
          {status === "success" ? (
            <div className="py-10 text-center">
              <p className="text-xl font-bold text-[#1a2413]">
                ¡Listo! Solicitud de ejemplo enviada.
              </p>
              <p className="mt-2 text-sm text-[#1a2413]/60">
                Este es un mensaje de confirmación simulado — no hay envío
                real a ningún servidor.
              </p>
            </div>
          ) : (
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre completo">
                  <input required type="text" className={inputClass} placeholder="Nombre de ejemplo" />
                </Field>
                <Field label="Nombre de la empresa">
                  <input required type="text" className={inputClass} placeholder="Empresa de ejemplo" />
                </Field>
                <Field label="Teléfono">
                  <input required type="tel" className={inputClass} placeholder="+00 000 000 000" />
                </Field>
                <Field label="Ubicación">
                  <select required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Selecciona una opción
                    </option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <fieldset>
                <legend className="text-sm font-semibold text-[#1a2413]">
                  Categorías de interés
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-2 text-sm text-[#1a2413]/80"
                    >
                      <input
                        type="checkbox"
                        checked={categories.includes(cat)}
                        onChange={() => setCategories((c) => toggleValue(c, cat))}
                        className="size-4 accent-[#1a2413]"
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <span className="text-sm font-semibold text-[#1a2413]">
                  Cantidad estimada
                </span>
                <div className="mt-2 flex gap-3">
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} flex-1`}
                    placeholder="0"
                    aria-label="Cantidad estimada"
                  />
                  <div className="flex overflow-hidden rounded-xl border border-[#1a2413]/15">
                    {(["unidad-1", "unidad-2"] as const).map((u) => (
                      <button
                        type="button"
                        key={u}
                        onClick={() => setUnit(u)}
                        aria-pressed={unit === u}
                        className={`px-4 text-sm font-medium transition-colors ${
                          unit === u
                            ? "bg-[#1a2413] text-[#eae6d9]"
                            : "text-[#1a2413]/60 hover:bg-[#1a2413]/5"
                        }`}
                      >
                        {u === "unidad-1" ? "Unidad 1" : "Unidad 2"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Field label="¿Cuándo lo necesitas?">
                <select required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecciona una opción
                  </option>
                  {TIMING_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <fieldset>
                <legend className="text-sm font-semibold text-[#1a2413]">
                  Tipo de programa actual
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {CURRENT_PROGRAMS.map((p) => (
                    <label
                      key={p}
                      className="flex items-center gap-2 text-sm text-[#1a2413]/80"
                    >
                      <input
                        type="checkbox"
                        checked={programs.includes(p)}
                        onChange={() => setPrograms((list) => toggleValue(list, p))}
                        className="size-4 accent-[#1a2413]"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>

              {status === "error" && (
                <p className="rounded-xl bg-red-100 px-4 py-3 text-sm text-red-700">
                  Ocurrió un error simulado al enviar el formulario. Inténtalo
                  de nuevo.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-2 rounded-full bg-[#1a2413] px-6 py-3.5 text-sm font-semibold text-[#eae6d9] transition-opacity disabled:opacity-60"
              >
                {status === "submitting" ? "Enviando…" : "Enviar solicitud"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
