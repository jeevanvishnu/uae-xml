"use client";

import React, { useState, useMemo } from "react";
import { DiagnosisItem, ICD10_CATALOG } from "@/app/context/DoctorContext";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  Plus,
  Trash,
  CheckCircle,
  WarningCircle,
  Tag,
} from "@phosphor-icons/react";

interface DiagnosisCoderProps {
  diagnoses: DiagnosisItem[];
  disabled?: boolean;
  onChange: (diagnoses: DiagnosisItem[]) => void;
}

export function DiagnosisCoder({
  diagnoses,
  disabled,
  onChange,
}: DiagnosisCoderProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const hasPrincipal = diagnoses.some((d) => d.type === "Principal");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICD10_CATALOG.slice(0, 6);
    return ICD10_CATALOG.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const handleAdd = (code: string, description: string) => {
    if (diagnoses.some((d) => d.code === code)) {
      toast.info(`${code} is already added`);
      return;
    }
    const nextType: "Principal" | "Secondary" = hasPrincipal ? "Secondary" : "Principal";
    onChange([...diagnoses, { code, description, type: nextType }]);
    setQuery("");
    setIsOpen(false);
    toast.success(`Added ${code} as ${nextType} diagnosis`);
  };

  const handleSetPrincipal = (code: string) => {
    onChange(
      diagnoses.map((d) => ({
        ...d,
        type: d.code === code ? "Principal" : "Secondary",
      }))
    );
  };

  const handleRemove = (code: string) => {
    const remaining = diagnoses.filter((d) => d.code !== code);
    // If Principal was removed and others remain, keep user aware (or let them pick Principal)
    onChange(remaining);
  };

  return (
    <section className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Tag size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">
              Diagnosis Coding (ICD-10-CM) <span className="text-red-500">*</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Exactly one <strong className="text-slate-700">Principal</strong> diagnosis is mandatory to complete the visit.
            </p>
          </div>
        </div>

        {hasPrincipal ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
            <CheckCircle size={13} weight="fill" />
            Principal ICD-10 Selected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-semibold">
            <WarningCircle size={13} weight="fill" />
            Principal Code Required
          </span>
        )}
      </div>

      {/* Searchable ICD-10 Picker */}
      {!disabled && (
        <div className="relative">
          <MagnifyingGlass
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder='Search ICD-10-CM by disease or code (e.g., "tonsillitis" or "J03")...'
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />

          {isOpen && (
            <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
              {results.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No matching ICD-10 codes found.
                </div>
              ) : (
                results.map((item) => {
                  const alreadyAdded = diagnoses.some((d) => d.code === item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => handleAdd(item.code, item.description)}
                      className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex items-center justify-between gap-3 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200">
                            {item.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 truncate">
                            {item.description}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
                        {alreadyAdded ? "Added" : <><Plus size={12} weight="bold" /> Add</>}
                      </span>
                    </button>
                  );
                })
              )}
              <div className="p-2 bg-slate-50 text-right">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Diagnoses List */}
      {diagnoses.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
          No diagnoses coded yet. Search above to add at least one Principal ICD-10-CM code.
        </div>
      ) : (
        <div className="space-y-2">
          {diagnoses.map((d) => {
            const isPrincipal = d.type === "Principal";
            return (
              <div
                key={d.code}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isPrincipal
                    ? "bg-blue-50/50 border-blue-200"
                    : "bg-slate-50/60 border-slate-200/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border shrink-0 ${
                      isPrincipal
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {d.code}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {d.description}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {isPrincipal ? "Principal (Primary) Diagnosis" : "Secondary Diagnosis"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!disabled && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSetPrincipal(d.code)}
                        disabled={isPrincipal}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          isPrincipal
                            ? "bg-blue-100 text-blue-800 cursor-default"
                            : "bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                        }`}
                      >
                        {isPrincipal ? "Principal" : "Set Principal"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(d.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove Diagnosis"
                      >
                        <Trash size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
