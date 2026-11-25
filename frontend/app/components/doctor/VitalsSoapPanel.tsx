"use client";

import React from "react";
import { Vitals } from "@/app/context/DoctorContext";
import {
  Heartbeat,
  Thermometer,
  Drop,
  Scales,
  Ruler,
  Wind,
  NotePencil,
  WarningCircle,
  CheckCircle,
} from "@phosphor-icons/react";

interface VitalsSoapPanelProps {
  vitals: Vitals;
  chiefComplaint: string;
  clinicalFindings: string;
  disabled?: boolean;
  onVitalsChange: (vitals: Vitals) => void;
  onComplaintChange: (val: string) => void;
  onFindingsChange: (val: string) => void;
}

export function VitalsSoapPanel({
  vitals,
  chiefComplaint,
  clinicalFindings,
  disabled,
  onVitalsChange,
  onComplaintChange,
  onFindingsChange,
}: VitalsSoapPanelProps) {
  const weightNum = parseFloat(vitals.weight);
  const heightM = parseFloat(vitals.height) / 100;
  const bmi =
    weightNum > 0 && heightM > 0 ? (weightNum / (heightM * heightM)).toFixed(1) : null;

  const tempNum = parseFloat(vitals.temperature);
  const spo2Num = parseFloat(vitals.spo2);
  const isFever = !isNaN(tempNum) && tempNum >= 38.0;
  const isHypoxic = !isNaN(spo2Num) && spo2Num < 95;

  const updateVital = (key: keyof Vitals, value: string) => {
    onVitalsChange({ ...vitals, [key]: value });
  };

  const soapComplete =
    chiefComplaint.trim().length > 0 && clinicalFindings.trim().length > 0;

  return (
    <section className="bg-white rounded-[28px] border border-slate-200/90 shadow-xs p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Heartbeat size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">
              Vitals &amp; Clinical Notes (SOAP)
            </h2>
            <p className="text-[11px] text-slate-500">
              Auditor-required narrative justifying ordered labs, imaging, and medications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bmi && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold border border-slate-200">
              BMI: {bmi} kg/m&sup2;
            </span>
          )}
          {soapComplete ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
              <CheckCircle size={13} weight="fill" />
              SOAP Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
              <WarningCircle size={13} weight="fill" />
              Notes Required
            </span>
          )}
        </div>
      </div>

      {/* 6 Vitals Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Blood Pressure */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Drop size={12} className="text-red-500" />
            BP (mmHg)
          </label>
          <input
            type="text"
            value={vitals.bp}
            disabled={disabled}
            onChange={(e) => updateVital("bp", e.target.value)}
            placeholder="120/80"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Temperature */}
        <div
          className={`p-2.5 rounded-xl border ${
            isFever ? "bg-red-50/60 border-red-200" : "bg-slate-50 border-slate-200/80"
          }`}
        >
          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Thermometer size={12} className={isFever ? "text-red-600" : "text-amber-500"} />
            Temp (&deg;C)
          </label>
          <input
            type="text"
            value={vitals.temperature}
            disabled={disabled}
            onChange={(e) => updateVital("temperature", e.target.value)}
            placeholder="36.8"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Pulse */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Heartbeat size={12} className="text-rose-500" />
            Pulse (bpm)
          </label>
          <input
            type="text"
            value={vitals.pulse}
            disabled={disabled}
            onChange={(e) => updateVital("pulse", e.target.value)}
            placeholder="76"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Weight */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Scales size={12} className="text-indigo-500" />
            Weight (kg)
          </label>
          <input
            type="text"
            value={vitals.weight}
            disabled={disabled}
            onChange={(e) => updateVital("weight", e.target.value)}
            placeholder="75"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* Height */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Ruler size={12} className="text-sky-500" />
            Height (cm)
          </label>
          <input
            type="text"
            value={vitals.height}
            disabled={disabled}
            onChange={(e) => updateVital("height", e.target.value)}
            placeholder="175"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>

        {/* SpO2 */}
        <div
          className={`p-2.5 rounded-xl border ${
            isHypoxic ? "bg-red-50/60 border-red-200" : "bg-slate-50 border-slate-200/80"
          }`}
        >
          <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Wind size={12} className={isHypoxic ? "text-red-600" : "text-emerald-600"} />
            SpO&#8322; (%)
          </label>
          <input
            type="text"
            value={vitals.spo2}
            disabled={disabled}
            onChange={(e) => updateVital("spo2", e.target.value)}
            placeholder="98"
            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 disabled:bg-slate-100"
          />
        </div>
      </div>

      {/* Chief Complaint & Clinical Findings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <NotePencil size={14} className="text-blue-600" />
              Chief Complaint <span className="text-red-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">Mandatory</span>
          </label>
          <textarea
            rows={3}
            value={chiefComplaint}
            disabled={disabled}
            onChange={(e) => onComplaintChange(e.target.value)}
            placeholder="Document primary symptoms, onset, and duration (e.g., Sore throat and fever for 2 days)..."
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors disabled:bg-slate-100"
          />
        </div>

        <div>
          <label className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
            <span className="flex items-center gap-1.5">
              <NotePencil size={14} className="text-blue-600" />
              Clinical Findings &amp; Examination <span className="text-red-500">*</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">Mandatory</span>
          </label>
          <textarea
            rows={3}
            value={clinicalFindings}
            disabled={disabled}
            onChange={(e) => onFindingsChange(e.target.value)}
            placeholder="Document physical exam findings & medical necessity for any lab/radiology orders..."
            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors disabled:bg-slate-100"
          />
        </div>
      </div>
    </section>
  );
}
