"use client";

import React, { useState, useMemo } from "react";
import {
  ProcedureItem,
  CPT_CATALOG,
  CptCode,
} from "@/app/context/DoctorContext";
import { toast } from "sonner";
import {
  MagnifyingGlass,
  Plus,
  Trash,
  ClipboardText,
  Warning,
  FileCode,
  IdentificationBadge,
  CheckCircle,
} from "@phosphor-icons/react";

interface ProceduresPanelProps {
  procedures: ProcedureItem[];
  clinicianLicense: string;
  copayPercent: number;
  copayCap: number;
  isInsured: boolean;
  disabled?: boolean;
  onChange: (procedures: ProcedureItem[]) => void;
  onTriggerPriorAuth: (procedureId: string) => void;
}

export function ProceduresPanel({
  procedures,
  clinicianLicense,
  copayPercent,
  copayCap,
  isInsured,
  disabled,
  onChange,
  onTriggerPriorAuth,
}: ProceduresPanelProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CPT_CATALOG.slice(0, 7);
    return CPT_CATALOG.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const computeFinancials = (unitPrice: number, quantity: number) => {
    const gross = Math.round(unitPrice * quantity * 100) / 100;
    const rawPtShare = isInsured ? (gross * copayPercent) / 100 : gross;
    const patientShare = isInsured
      ? Math.min(rawPtShare, copayCap > 0 ? copayCap : rawPtShare)
      : gross;
    const net = Math.max(0, gross - patientShare);
    return { gross, patientShare, net };
  };

  const handleAdd = (cpt: CptCode) => {
    const quantity = 1;
    const { gross, patientShare, net } = computeFinancials(cpt.unitPrice, quantity);
    const newItem: ProcedureItem = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      code: cpt.code,
      type: cpt.type,
      description: cpt.description,
      quantity,
      unitPrice: cpt.unitPrice,
      gross,
      patientShare,
      net,
      clinicianLicense,
      requiresPriorAuth: cpt.requiresPriorAuth,
      priorAuthStatus: "NONE",
    };
    onChange([...procedures, newItem]);
    setQuery("");
    setIsOpen(false);
    if (cpt.requiresPriorAuth) {
      toast.warning(`${cpt.code} requires Prior Authorization under this plan`);
    } else {
      toast.success(`Added ${cpt.code} (${cpt.category})`);
    }
  };

  const handleQtyChange = (id: string, nextQty: number) => {
    const qty = Math.max(1, nextQty);
    onChange(
      procedures.map((p) => {
        if (p.id !== id) return p;
        const { gross, patientShare, net } = computeFinancials(p.unitPrice, qty);
        return { ...p, quantity: qty, gross, patientShare, net };
      })
    );
  };

  const handleRemove = (id: string) => {
    onChange(procedures.filter((p) => p.id !== id));
  };

  const totalGross = procedures.reduce((s, p) => s + p.gross, 0);
  const totalPt = procedures.reduce((s, p) => s + p.patientShare, 0);
  const totalNet = procedures.reduce((s, p) => s + p.net, 0);

  return (
    <section className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <ClipboardText size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">
              Procedures, Labs &amp; Services (CPT / HCPCS / DSL)
            </h2>
            <p className="text-[11px] text-slate-500">
              Auto-stamped with Clinician License <span className="font-mono font-semibold text-slate-700">{clinicianLicense}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 font-mono">
            <span className="text-slate-500">Gross: </span>
            <span className="font-bold text-slate-900">AED {totalGross.toFixed(0)}</span>
          </div>
          <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 font-mono">
            <span className="text-emerald-700">Payer Net: </span>
            <span className="font-bold text-emerald-800">AED {totalNet.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Searchable Service Picker */}
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
            placeholder='Search CPT / HCPCS / DSL (e.g., "99213", "85025 CBC", "MRI")...'
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />

          {isOpen && (
            <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-68 overflow-y-auto divide-y divide-slate-100">
              {results.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No matching CPT/HCPCS/DSL services found.
                </div>
              ) : (
                results.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleAdd(item)}
                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50/60 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-mono text-[11px] font-bold border border-sky-200">
                          {item.code}
                        </span>
                        <span className="text-[11px] font-bold uppercase text-slate-400">
                          {item.type} &bull; {item.category}
                        </span>
                        {item.requiresPriorAuth && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            Prior Auth
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                        {item.description}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-800">
                        AED {item.unitPrice}
                      </div>
                      <span className="text-[11px] font-semibold text-blue-600 inline-flex items-center gap-0.5">
                        <Plus size={11} weight="bold" /> Add
                      </span>
                    </div>
                  </button>
                ))
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

      {/* Selected Services Table */}
      {procedures.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
          No procedures or lab orders added yet. Search above to add CPT, HCPCS, or DSL codes.
        </div>
      ) : (
        <div className="space-y-2.5">
          {procedures.map((proc) => (
            <div
              key={proc.id}
              className={`p-3.5 rounded-xl border transition-colors ${
                proc.requiresPriorAuth && proc.priorAuthStatus === "NONE"
                  ? "bg-amber-50/40 border-amber-200"
                  : "bg-slate-50/60 border-slate-200/80"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-mono text-xs font-bold border border-slate-200">
                      {proc.code}
                    </span>
                    <span className="text-[11px] font-bold uppercase text-slate-400">
                      {proc.type}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                      <IdentificationBadge size={11} />
                      {proc.clinicianLicense}
                    </span>

                    {proc.requiresPriorAuth && proc.priorAuthStatus === "NONE" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold">
                        <Warning size={12} weight="fill" />
                        Requires Prior Auth
                      </span>
                    )}
                    {proc.priorAuthStatus === "REQUESTED" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
                        <CheckCircle size={12} weight="fill" />
                        PriorRequest Sent ({proc.priorAuthRef})
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {proc.description}
                  </div>
                </div>

                {/* Quantity, Pricing & Prior Auth Trigger */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  {proc.requiresPriorAuth && (
                    <button
                      type="button"
                      onClick={() => onTriggerPriorAuth(proc.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileCode size={14} weight="bold" />
                      {proc.priorAuthStatus === "REQUESTED"
                        ? "View PriorRequest.xml"
                        : "Trigger PriorRequest.xml"}
                    </button>
                  )}

                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[11px] font-bold text-slate-400">QTY</span>
                    <input
                      type="number"
                      min={1}
                      disabled={disabled}
                      value={proc.quantity}
                      onChange={(e) =>
                        handleQtyChange(proc.id, parseInt(e.target.value, 10) || 1)
                      }
                      className="w-10 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="text-right font-mono min-w-[90px]">
                    <div className="text-xs font-bold text-slate-900">
                      AED {proc.gross.toFixed(0)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Co-pay: AED {proc.patientShare.toFixed(0)}
                    </div>
                  </div>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleRemove(proc.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove Service"
                    >
                      <Trash size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Co-pay Summary Footer */}
          <div className="flex items-center justify-between px-3 pt-2 text-[11px] text-slate-500">
            <span>Patient Co-Pay Total: <strong className="font-mono text-slate-800">AED {totalPt.toFixed(2)}</strong></span>
            <span>Claimable Insurance Net: <strong className="font-mono text-emerald-700">AED {totalNet.toFixed(2)}</strong></span>
          </div>
        </div>
      )}
    </section>
  );
}
