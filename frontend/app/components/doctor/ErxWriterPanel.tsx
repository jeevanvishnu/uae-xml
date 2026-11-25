"use client";

import React, { useState, useMemo } from "react";
import {
  ErxMedicationItem,
  ErxTransmission,
  UAE_DRUG_CATALOG,
  DrugCatalogItem,
  FREQUENCY_OPTIONS,
} from "@/app/context/DoctorContext";
import { toast } from "sonner";
import {
  Pill,
  MagnifyingGlass,
  Plus,
  Trash,
  PaperPlaneTilt,
  Printer,
  FileCode,
  CheckCircle,
} from "@phosphor-icons/react";

interface ErxWriterPanelProps {
  medications: ErxMedicationItem[];
  transmission?: ErxTransmission;
  disabled?: boolean;
  onChange: (medications: ErxMedicationItem[]) => void;
  onTransmitErx: () => void;
  onViewErxXml: () => void;
  onPrintSlip: () => void;
}

const ROUTES = ["Oral", "Topical", "Inhalation", "Ophthalmic", "IV", "IM"];
const UNITS = ["Tablet", "Capsule", "ml", "Puff", "Drop", "Application"];

export function ErxWriterPanel({
  medications,
  transmission,
  disabled,
  onChange,
  onTransmitErx,
  onViewErxXml,
  onPrintSlip,
}: ErxWriterPanelProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return UAE_DRUG_CATALOG.slice(0, 6);
    return UAE_DRUG_CATALOG.filter(
      (d) =>
        d.tradeName.toLowerCase().includes(q) ||
        d.genericName.toLowerCase().includes(q) ||
        d.drugCode.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [query]);

  const calcTotalQty = (dose: string, multiplier: number, days: number) => {
    const d = parseFloat(dose) || 1;
    return Math.max(1, Math.ceil(d * multiplier * days));
  };

  const handleAddDrug = (drug: DrugCatalogItem) => {
    const freq = FREQUENCY_OPTIONS[1]; // BID default
    const durationDays = 7;
    const totalQuantity = calcTotalQty(drug.defaultDose, freq.multiplier, durationDays);

    const newItem: ErxMedicationItem = {
      id: `RX-${Date.now().toString().slice(-5)}`,
      drugCode: drug.drugCode,
      formulary: drug.formulary,
      tradeName: drug.tradeName,
      genericName: drug.genericName,
      dose: drug.defaultDose,
      unit: drug.defaultUnit,
      route: drug.defaultRoute,
      frequency: freq.code,
      frequencyMultiplier: freq.multiplier,
      durationDays,
      totalQuantity,
      instructions: "Take after meals",
      unitPrice: drug.unitPrice,
    };

    onChange([...medications, newItem]);
    setQuery("");
    setIsOpen(false);
    toast.success(`Added ${drug.tradeName} (${drug.formulary})`);
  };

  const updateMed = (id: string, patch: Partial<ErxMedicationItem>) => {
    onChange(
      medications.map((m) => {
        if (m.id !== id) return m;
        const merged = { ...m, ...patch };
        if (
          patch.dose !== undefined ||
          patch.frequencyMultiplier !== undefined ||
          patch.durationDays !== undefined
        ) {
          merged.totalQuantity = calcTotalQty(
            merged.dose,
            merged.frequencyMultiplier,
            merged.durationDays
          );
        }
        return merged;
      })
    );
  };

  const removeMed = (id: string) => {
    onChange(medications.filter((m) => m.id !== id));
  };

  return (
    <section className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <Pill size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">
              e-Prescription (eRx) Writer
            </h2>
            <p className="text-[11px] text-slate-500">
              UAE DDC (Dubai) &amp; MoHAP Formulary
            </p>
          </div>
        </div>

        {transmission && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-mono font-bold">
            <CheckCircle size={12} weight="fill" />
            {transmission.erxRefNo}
          </span>
        )}
      </div>

      {/* Drug Search */}
      {!disabled && (
        <div className="relative">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder="Search DDC / MoHAP by brand or generic..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 transition-colors"
          />

          {isOpen && (
            <div className="absolute z-30 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
              {results.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No matching UAE formulary drugs found.
                </div>
              ) : (
                results.map((d) => (
                  <button
                    key={d.drugCode}
                    type="button"
                    onClick={() => handleAddDrug(d)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-50/50 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold border border-emerald-200">
                          {d.drugCode}
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {d.tradeName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {d.genericName}
                      </div>
                    </div>
                    <Plus size={14} weight="bold" className="text-emerald-600 shrink-0" />
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

      {/* Medication Cards */}
      {medications.length === 0 ? (
        <div className="p-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500">
          Search the DDC / MoHAP drug list above to prescribe medications.
        </div>
      ) : (
        <div className="space-y-3">
          {medications.map((med) => (
            <div
              key={med.id}
              className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-white text-emerald-700 font-mono text-[11px] font-bold border border-emerald-200">
                      {med.drugCode}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {med.tradeName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {med.genericName}
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeMed(med.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>

              {/* Dosage & Dispensing Fields */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                    Dose &amp; Unit
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      disabled={disabled}
                      value={med.dose}
                      onChange={(e) => updateMed(med.id, { dose: e.target.value })}
                      className="w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900"
                    />
                    <select
                      disabled={disabled}
                      value={med.unit}
                      onChange={(e) => updateMed(med.id, { unit: e.target.value })}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] font-medium text-slate-800"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                    Route
                  </label>
                  <select
                    disabled={disabled}
                    value={med.route}
                    onChange={(e) => updateMed(med.id, { route: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800"
                  >
                    {ROUTES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                    Frequency
                  </label>
                  <select
                    disabled={disabled}
                    value={med.frequency}
                    onChange={(e) => {
                      const opt = FREQUENCY_OPTIONS.find(
                        (f) => f.code === e.target.value
                      );
                      if (opt) {
                        updateMed(med.id, {
                          frequency: opt.code,
                          frequencyMultiplier: opt.multiplier,
                        });
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f.code} value={f.code}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-0.5">
                    Days &amp; Total Qty
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      disabled={disabled}
                      value={med.durationDays}
                      onChange={(e) =>
                        updateMed(med.id, {
                          durationDays: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-12 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900"
                      title="Duration in Days"
                    />
                    <span className="text-[11px] text-slate-400">d =</span>
                    <input
                      type="number"
                      min={1}
                      disabled={disabled}
                      value={med.totalQuantity}
                      onChange={(e) =>
                        updateMed(med.id, {
                          totalQuantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                        })
                      }
                      className="w-14 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-emerald-800"
                      title="Auto-calculated Total Quantity"
                    />
                  </div>
                </div>
              </div>

              <input
                type="text"
                disabled={disabled}
                value={med.instructions}
                onChange={(e) => updateMed(med.id, { instructions: e.target.value })}
                placeholder="Patient instructions (e.g., Take after meals)..."
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700"
              />
            </div>
          ))}
        </div>
      )}

      {/* Transmit eRx & Output Actions */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <button
          type="button"
          disabled={medications.length === 0 || disabled}
          onClick={onTransmitErx}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <PaperPlaneTilt size={15} weight="bold" />
          {transmission ? "Re-Transmit eRx (ePrescription.xml)" : "Transmit eRx to Hub"}
        </button>

        {transmission && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onViewErxXml}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <FileCode size={14} />
              View eRx XML
            </button>
            <button
              type="button"
              onClick={onPrintSlip}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              <Printer size={14} weight="bold" />
              Print Rx Slip
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
